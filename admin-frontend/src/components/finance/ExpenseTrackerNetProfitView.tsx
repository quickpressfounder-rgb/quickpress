import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Receipt,
  Server,
  Package,
  Megaphone,
  Briefcase,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  CreditCard,
  Building2,
  RefreshCw,
  Sparkles,
  PieChart,
} from "lucide-react";
import {
  fetchExpenses,
  createExpense,
  deleteExpense,
  fetchNetProfitReport,
  BusinessExpense,
} from "@/api/finance-api";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { toast } from "sonner";

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: any; color: string; bg: string; border: string }
> = {
  MARKETING: {
    label: "Marketing & Ads",
    icon: Megaphone,
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  SERVERS_TECH: {
    label: "Cloud & WhatsApp OTPs",
    icon: Server,
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  PACKAGING: {
    label: "Packaging & Bags",
    icon: Package,
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
  STAFF_OFFICE: {
    label: "Hub Ops & Supplies",
    icon: Building2,
    color: "text-zinc-800",
    bg: "bg-zinc-100",
    border: "border-zinc-300",
  },
  LOGISTICS: {
    label: "Fleet & Bags Maintenance",
    icon: Briefcase,
    color: "text-indigo-700",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
  },
  MISC: {
    label: "Miscellaneous",
    icon: Layers,
    color: "text-zinc-600",
    bg: "bg-zinc-50",
    border: "border-zinc-200",
  },
};

export function ExpenseTrackerNetProfitView() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State for New Expense
  const [form, setForm] = useState({
    title: "",
    category: "MARKETING",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    paymentMode: "UPI",
    notes: "",
  });

  // Queries
  const expensesQuery = useQuery({
    queryKey: ["finance", "expenses", selectedCategory],
    queryFn: () => fetchExpenses(selectedCategory),
  });

  const profitQuery = useQuery({
    queryKey: ["finance", "net-profit-report"],
    queryFn: fetchNetProfitReport,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<BusinessExpense>) => createExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "net-profit-report"] });
      toast.success("Operational expense logged successfully");
      setIsAddModalOpen(false);
      setForm({
        title: "",
        category: "MARKETING",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        paymentMode: "UPI",
        notes: "",
      });
    },
    onError: () => {
      toast.error("Failed to log expense");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "net-profit-report"] });
      toast.success("Expense entry removed");
    },
    onError: () => {
      toast.error("Failed to remove expense");
    },
  });

  const handleSaveExpense = () => {
    if (!form.title.trim()) {
      toast.error("Please enter expense title");
      return;
    }
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    createMutation.mutate({
      title: form.title.trim(),
      category: form.category,
      amount: amt,
      date: form.date,
      paymentMode: form.paymentMode,
      notes: form.notes.trim(),
    });
  };

  const report = profitQuery.data;
  const waterfall = report?.waterfallPer100;
  const isNetPositive = (report?.profitability?.realNetProfit ?? 0) >= 0;

  return (
    <div className="space-y-6">
      {/* View Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Wallet className="size-5" />
            </span>
            <h2 className="text-lg font-black text-zinc-900 tracking-tight">
              Expense Tracker & Real Net Profit (PAT)
            </h2>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-black text-[10px]">
              LIVE IN-HAND PROFIT
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 mt-1 max-w-2xl font-medium">
            Calculates exact profit in hand after subtracting Merchant Partner settlements,
            Delivery Rider earnings, Government Taxes (GST/TCS/TDS), Payment Gateway fees, and
            logged Operating Overheads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              expensesQuery.refetch();
              profitQuery.refetch();
              toast.info("Refreshed real-time financial metrics");
            }}
            className="text-xs font-bold gap-1.5 h-9"
          >
            <RefreshCw className="size-3.5" />
            <span>Refresh P&L</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 text-xs h-9 px-4 shadow-sm"
          >
            <Plus className="size-4" />
            <span>Log Expense</span>
          </Button>
        </div>
      </div>

      {/* Top 5 High-Impact Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. Customer Inflows */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
            1. Customer Inflows (GMV)
          </span>
          <div className="text-2xl font-black text-zinc-900 font-mono">
            ₹{report?.inflows?.grossGmv?.toLocaleString("en-IN") ?? "0"}
          </div>
          <span className="text-[10px] text-zinc-400 block">
            Across {report?.totalOrders ?? 0} customer orders
          </span>
        </div>

        {/* 2. Partner Payouts */}
        <div className="p-4 rounded-2xl bg-white border border-blue-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">
              2. Partner Share
            </span>
            <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-800 font-bold rounded">
              {waterfall?.partnerShare ?? 58}%
            </span>
          </div>
          <div className="text-2xl font-black text-blue-700 font-mono">
            -₹{report?.outflows?.partnerPayouts?.toLocaleString("en-IN") ?? "0"}
          </div>
          <span className="text-[10px] text-blue-600/80 block">
            Net merchant laundry earnings
          </span>
        </div>

        {/* 3. Rider & Fleet Payouts */}
        <div className="p-4 rounded-2xl bg-white border border-amber-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
              3. Rider Payouts
            </span>
            <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 font-bold rounded">
              {waterfall?.riderShare ?? 18}%
            </span>
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono">
            -₹{report?.outflows?.riderPayouts?.toLocaleString("en-IN") ?? "0"}
          </div>
          <span className="text-[10px] text-amber-700/80 block">
            Delivery fares + 100% tips
          </span>
        </div>

        {/* 4. Taxes & Gateway Fees */}
        <div className="p-4 rounded-2xl bg-white border border-purple-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider">
              4. Taxes & Gateway
            </span>
            <span className="text-[10px] px-1.5 py-0.2 bg-purple-100 text-purple-800 font-bold rounded">
              {((waterfall?.taxesAndGst ?? 6) + (waterfall?.gatewayFees ?? 2)).toFixed(0)}%
            </span>
          </div>
          <div className="text-2xl font-black text-purple-700 font-mono">
            -₹
            {(
              (report?.outflows?.taxesAndGst ?? 0) + (report?.outflows?.gatewayCharges ?? 0)
            ).toLocaleString("en-IN")}
          </div>
          <span className="text-[10px] text-purple-600/80 block">
            GST + TCS/TDS + 2% Gateway
          </span>
        </div>

        {/* 5. REAL NET IN-HAND PROFIT (HERO CARD) */}
        <div
          className={`p-4 rounded-2xl border shadow-md space-y-1 ${
            isNetPositive
              ? "bg-gradient-to-br from-emerald-50 to-teal-50/80 border-emerald-300 ring-2 ring-emerald-500/20"
              : "bg-rose-50 border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="size-3 text-emerald-600" />
              <span>Real Net Profit</span>
            </span>
            <Badge
              className={`font-black text-[10px] px-2 ${
                isNetPositive
                  ? "bg-emerald-600 text-white"
                  : "bg-rose-600 text-white"
              }`}
            >
              {report?.profitability?.netProfitMarginPct ?? 0}% Margin
            </Badge>
          </div>
          <div
            className={`text-2xl font-black font-mono ${
              isNetPositive ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            ₹{report?.profitability?.realNetProfit?.toLocaleString("en-IN") ?? "0"}
          </div>
          <span className="text-[10px] text-emerald-800 font-semibold block">
            Pure profit retained in bank
          </span>
        </div>
      </div>

      {/* P&L Waterfall: Where Does Every ₹100 Go? */}
      <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChart className="size-4 text-emerald-600" />
            <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wide">
              P&L Waterfall: Where Does Every ₹100 Customer Payment Go?
            </h3>
          </div>
          <span className="text-xs text-zinc-500 font-medium">
            100% Reconciled Unit Economics
          </span>
        </div>

        {/* Multi-segmented visual bar */}
        <div className="h-4 rounded-full overflow-hidden flex bg-zinc-100 border border-zinc-200">
          <div
            style={{ width: `${waterfall?.partnerShare ?? 58}%` }}
            className="bg-blue-500 transition-all duration-300 hover:opacity-90"
            title={`Partner Share: ₹${waterfall?.partnerShare ?? 58}`}
          />
          <div
            style={{ width: `${waterfall?.riderShare ?? 18}%` }}
            className="bg-amber-400 transition-all duration-300 hover:opacity-90"
            title={`Rider Share: ₹${waterfall?.riderShare ?? 18}`}
          />
          <div
            style={{ width: `${waterfall?.taxesAndGst ?? 6}%` }}
            className="bg-purple-500 transition-all duration-300 hover:opacity-90"
            title={`Taxes: ₹${waterfall?.taxesAndGst ?? 6}`}
          />
          <div
            style={{ width: `${waterfall?.gatewayFees ?? 2}%` }}
            className="bg-zinc-400 transition-all duration-300 hover:opacity-90"
            title={`Payment Gateway: ₹${waterfall?.gatewayFees ?? 2}`}
          />
          <div
            style={{ width: `${waterfall?.operatingExpenses ?? 9}%` }}
            className="bg-rose-400 transition-all duration-300 hover:opacity-90"
            title={`Operating Expenses: ₹${waterfall?.operatingExpenses ?? 9}`}
          />
          <div
            style={{ width: `${Math.max(0, waterfall?.netProfitInHand ?? 7)}%` }}
            className="bg-emerald-500 transition-all duration-300 hover:opacity-90"
            title={`Real Net Profit: ₹${waterfall?.netProfitInHand ?? 7}`}
          />
        </div>

        {/* Breakdown chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-blue-500 shrink-0" />
            <div>
              <span className="text-[10px] text-blue-900/70 block font-medium">Merchant Share</span>
              <span className="font-bold font-mono text-blue-950">₹{waterfall?.partnerShare ?? 58}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100 flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-amber-400 shrink-0" />
            <div>
              <span className="text-[10px] text-amber-900/70 block font-medium">Rider / Fleet</span>
              <span className="font-bold font-mono text-amber-950">₹{waterfall?.riderShare ?? 18}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-100 flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-purple-500 shrink-0" />
            <div>
              <span className="text-[10px] text-purple-900/70 block font-medium">Govt Taxes (GST)</span>
              <span className="font-bold font-mono text-purple-950">₹{waterfall?.taxesAndGst ?? 6}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-zinc-400 shrink-0" />
            <div>
              <span className="text-[10px] text-zinc-600 block font-medium">Payment Gateway</span>
              <span className="font-bold font-mono text-zinc-900">₹{waterfall?.gatewayFees ?? 2}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-100 flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-rose-400 shrink-0" />
            <div>
              <span className="text-[10px] text-rose-900/70 block font-medium">Opex (Ads & Hub)</span>
              <span className="font-bold font-mono text-rose-950">₹{waterfall?.operatingExpenses ?? 9}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-emerald-500 shrink-0" />
            <div>
              <span className="text-[10px] text-emerald-900/80 block font-bold">Pure Net Profit</span>
              <span className="font-black font-mono text-emerald-700">₹{waterfall?.netProfitInHand ?? 7}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Operating Expenses Management Section */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
        {/* Category Pills & Table Header */}
        <div className="p-4 border-b border-zinc-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Receipt className="size-4 text-zinc-700" />
            <h3 className="text-sm font-black text-zinc-900">
              Operating Business Expenses (Opex Ledger)
            </h3>
            <Badge variant="outline" className="text-xs font-mono font-bold">
              Total: ₹{expensesQuery.data?.totalOpex?.toLocaleString("en-IN") ?? "0"}
            </Badge>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedCategory === "ALL"
                  ? "bg-zinc-900 text-white shadow-xs"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              All ({expensesQuery.data?.totalCount ?? 0})
            </button>
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
              const catTotal = expensesQuery.data?.byCategory?.[key] || 0;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    selectedCategory === key
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  <span>{cfg.label}</span>
                  {catTotal > 0 && (
                    <span className="text-[10px] opacity-80 font-mono">
                      (₹{catTotal})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Expenses Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Expense Title & Details</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Payment Mode</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium">
              {expensesQuery.data?.expenses && expensesQuery.data.expenses.length > 0 ? (
                expensesQuery.data.expenses.map((exp) => {
                  const catCfg = CATEGORY_CONFIG[exp.category] || CATEGORY_CONFIG.MISC;
                  const Icon = catCfg.icon;
                  return (
                    <tr key={exp.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-zinc-900">{exp.title}</div>
                        {exp.notes && (
                          <div className="text-[11px] text-zinc-400 line-clamp-1">
                            {exp.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${catCfg.bg} ${catCfg.color} ${catCfg.border}`}
                        >
                          <Icon className="size-3" />
                          <span>{catCfg.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-600">
                        {exp.date || "Recent"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-bold">
                          {exp.paymentMode || "UPI"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-black font-mono text-sm text-zinc-900">
                        ₹{exp.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          PAID
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete expense "${exp.title}"?`)) {
                              deleteMutation.mutate(exp.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete expense entry"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400 text-xs">
                    No operating expenses recorded for this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Log New Business Expense */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="size-5 text-emerald-600" />
              <span>Log Business Operating Expense</span>
            </DialogTitle>
            <DialogDescription>
              Record marketing, cloud, packaging, or hub expenses to calculate true net profit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-bold">Expense Title / Description</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Meta Ads Instagram Campaign"
                className="mt-1 font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}
                >
                  <SelectTrigger className="mt-1 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        {cfg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold">Amount (₹)</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="2500"
                  className="mt-1 font-mono font-black text-rose-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Date Incurred</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                  className="mt-1 font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Payment Mode</Label>
                <Select
                  value={form.paymentMode}
                  onValueChange={(v) => setForm((p) => ({ ...p, paymentMode: v }))}
                >
                  <SelectTrigger className="mt-1 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UPI">UPI / GPay / PhonePe</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Net Banking / NEFT</SelectItem>
                    <SelectItem value="CARD">Corporate Debit / Credit Card</SelectItem>
                    <SelectItem value="CASH">Cash Petty Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold">Vendor / Invoice Notes (Optional)</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="e.g. Invoice #2026-081 from Meta India"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveExpense}
              disabled={createMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {createMutation.isPending ? "Logging..." : "Record Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
