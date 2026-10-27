import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Receipt,
  FileCheck2,
  Calendar,
  RefreshCw,
  Building2,
  Scale,
  ShieldCheck,
  AlertCircle,
  Clock,
  Download,
  FileText,
  Search,
  Check,
  Copy,
  Info,
  ArrowUpRight,
  Truck,
  Sparkles,
  Layers,
  FileSpreadsheet,
  Plus,
  Trash2,
  Wallet,
  X,
  CreditCard,
  DollarSign,
  Eye,
  TrendingDown,
  TrendingUp,
  Percent,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import {
  fetchTaxCenter,
  recordTaxChallan,
  deleteTaxChallan,
  generateGstr1Report,
  generateGstr3bReport,
  fetchBusinessExpenses,
  addBusinessExpense,
  deleteBusinessExpense,
  fetchCustomerDepositsSummary,
  fetchCustomerWalletHistory,
  TaxCenterResponse,
  BusinessExpense,
  CustomerDepositsSummaryResponse,
} from "@/api/finance-api";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";

type ActiveTaxTab =
  | "gstr3b"
  | "challans"
  | "expenses_itc"
  | "customer_deposits"
  | "gstr8"
  | "invoices_3way"
  | "b2b_invoices"
  | "calendar";

export function TaxComplianceCenterView() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ActiveTaxTab>("gstr3b");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modals state
  const [drilldownModal, setDrilldownModal] = useState<"today" | "platform" | "partner" | "tds" | null>(null);
  const [isRecordChallanOpen, setIsRecordChallanOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isGstr1ModalOpen, setIsGstr1ModalOpen] = useState(false);
  const [isGstr3bModalOpen, setIsGstr3bModalOpen] = useState(false);
  const [gstr1Data, setGstr1Data] = useState<any | null>(null);
  const [gstr3bData, setGstr3bData] = useState<any | null>(null);
  const [isGeneratingGstr, setIsGeneratingGstr] = useState(false);
  const [selectedCustomerForPassbook, setSelectedCustomerForPassbook] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Challan form state
  const [challanForm, setChallanForm] = useState({
    taxPeriod: "October 2026",
    cpin: "26100900182741",
    cin: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    cgstPaid: 5000,
    sgstPaid: 5000,
    igstPaid: 0,
    bankName: "HDFC Bank Corporate - A/c 8812",
    paymentMode: "NEFT/RTGS",
    notes: "Advance GST Challan PMT-06 Payment",
  });

  // Expense form state
  const [expenseForm, setExpenseForm] = useState({
    title: "",
    vendorName: "",
    vendorGstin: "",
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().slice(0, 10),
    category: "SERVERS_TECH",
    baseAmount: 1000,
    gstRate: 18,
    itcEligible: true,
    paymentMode: "UPI",
    notes: "",
  });

  // Queries
  const { data, isLoading, isError, refetch } = useQuery<TaxCenterResponse>({
    queryKey: ["tax-center"],
    queryFn: () => fetchTaxCenter(),
    staleTime: 30000,
  });

  const { data: depositsData, isLoading: isDepositsLoading } = useQuery<CustomerDepositsSummaryResponse>({
    queryKey: ["customer-deposits-summary"],
    queryFn: () => fetchCustomerDepositsSummary(),
    staleTime: 30000,
  });

  const { data: expensesData, isLoading: isExpensesLoading, refetch: refetchExpenses } = useQuery({
    queryKey: ["business-expenses-tax"],
    queryFn: () => fetchBusinessExpenses(),
    staleTime: 30000,
  });

  const { data: customerPassbookData, isLoading: isPassbookLoading } = useQuery({
    queryKey: ["customer-wallet-history", selectedCustomerForPassbook],
    queryFn: () => fetchCustomerWalletHistory(selectedCustomerForPassbook!),
    enabled: !!selectedCustomerForPassbook,
  });

  const summary = data?.taxSummary;
  const calendar = data?.complianceCalendar || [];
  const gstr3b = data?.gstr3bLedger || [];
  const gstr8 = data?.gstr8TcsLedger || [];
  const b2bInvoices = data?.b2bInvoicesLedger || [];
  const threeWayInvoices = data?.threeWayInvoicesSample || [];
  const challansList = data?.challansList || [];
  const expensesList = expensesData?.expenses || data?.expensesList || [];

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Helper to trigger file downloads
  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Mutations
  const recordChallanMutation = useMutation({
    mutationFn: (payload: any) => recordTaxChallan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-center"] });
      setIsRecordChallanOpen(false);
    },
  });

  const deleteChallanMutation = useMutation({
    mutationFn: (id: string) => deleteTaxChallan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-center"] });
    },
  });

  const addExpenseMutation = useMutation({
    mutationFn: (payload: any) => addBusinessExpense(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-center"] });
      queryClient.invalidateQueries({ queryKey: ["business-expenses-tax"] });
      setIsAddExpenseOpen(false);
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) => deleteBusinessExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-center"] });
      queryClient.invalidateQueries({ queryKey: ["business-expenses-tax"] });
    },
  });

  // Handle GSTR-1 Generation
  const handleOpenGstr1 = async () => {
    setIsGeneratingGstr(true);
    try {
      const res = await generateGstr1Report();
      setGstr1Data(res);
      setIsGstr1ModalOpen(true);
    } catch (e) {
      console.error("GSTR-1 generation error", e);
    } finally {
      setIsGeneratingGstr(false);
    }
  };

  // Handle GSTR-3B Generation
  const handleOpenGstr3b = async () => {
    setIsGeneratingGstr(true);
    try {
      const res = await generateGstr3bReport();
      setGstr3bData(res);
      setIsGstr3bModalOpen(true);
    } catch (e) {
      console.error("GSTR-3B generation error", e);
    } finally {
      setIsGeneratingGstr(false);
    }
  };

  // Filtered lists
  const filteredThreeWayInvoices = useMemo(() => {
    if (!searchQuery.trim()) return threeWayInvoices;
    const q = searchQuery.toLowerCase();
    return threeWayInvoices.filter(
      (inv) =>
        inv.orderId.toLowerCase().includes(q) ||
        inv.partnerInvoiceNo.toLowerCase().includes(q) ||
        inv.riderReceiptNo.toLowerCase().includes(q) ||
        inv.platformInvoiceNo.toLowerCase().includes(q) ||
        (inv.partnerGstin || "").toLowerCase().includes(q) ||
        inv.partnerName.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q)
    );
  }, [threeWayInvoices, searchQuery]);

  const filteredCustomerLedger = useMemo(() => {
    const list = depositsData?.customerLedger || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (c) =>
        c.customerName.toLowerCase().includes(q) ||
        c.customerPhone.toLowerCase().includes(q) ||
        c.customerEmail.toLowerCase().includes(q) ||
        c.userId.toLowerCase().includes(q)
    );
  }, [depositsData, searchQuery]);

  const filteredExpenses = useMemo(() => {
    if (!searchQuery.trim()) return expensesList;
    const q = searchQuery.toLowerCase();
    return expensesList.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.vendorName.toLowerCase().includes(q) ||
        (e.vendorGstin || "").toLowerCase().includes(q) ||
        e.invoiceNumber.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
    );
  }, [expensesList, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. HEADER & CORPORATE STATUTORY REGISTRATION */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Receipt className="size-5" />
            </span>
            <h2 className="text-lg font-black text-zinc-950 tracking-tight">
              GST, TDS & Statutory Tax Center
            </h2>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
              Section 9(5) & 52 Compliant
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Real-time tax tracking, Today Collected Tax, Platform GST, Partner GST, TDS/TCS with Challan Balance Offset & Input Tax Credit (ITC).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3 py-1.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-mono text-zinc-700 flex items-center gap-1.5">
            <span className="text-zinc-400 font-sans text-[11px]">GSTIN:</span>
            <span className="font-bold text-zinc-950">{data?.gstin || "09AADCB1234K1Z8"}</span>
            <button
              type="button"
              onClick={() => copyToClipboard(data?.gstin || "09AADCB1234K1Z8", "gstin")}
              className="text-zinc-400 hover:text-zinc-800 ml-1"
              title="Copy GSTIN"
            >
              {copiedKey === "gstin" ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
            </button>
          </div>

          <div className="px-3 py-1.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-mono text-zinc-700">
            <span className="text-zinc-400 font-sans text-[11px]">PAN:</span>{" "}
            <span className="font-bold text-zinc-950">{data?.pan || "AADCB1234K"}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              refetchExpenses();
            }}
            disabled={isLoading}
            className="h-9 text-xs rounded-xl border-zinc-200"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {/* Report Generation Actions */}
          <Button
            variant="default"
            size="sm"
            onClick={handleOpenGstr1}
            disabled={isGeneratingGstr}
            className="h-9 text-xs rounded-xl bg-zinc-950 text-white hover:bg-zinc-800"
          >
            <FileSpreadsheet className="size-3.5 mr-1.5 text-emerald-400" />
            GSTR-1 Report
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleOpenGstr3b}
            disabled={isGeneratingGstr}
            className="h-9 text-xs rounded-xl bg-emerald-700 text-white hover:bg-emerald-800"
          >
            <FileCheck2 className="size-3.5 mr-1.5" />
            GSTR-3B Report
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-12 text-center shadow-xs">
          <RefreshCw className="size-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-700">Calculating Statutory Tax Liabilities from Live Orders...</p>
        </div>
      )}

      {isError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-800">
          <AlertCircle className="size-6 mx-auto mb-2 text-rose-600" />
          <h4 className="text-sm font-bold">Failed to load tax compliance engine</h4>
          <p className="text-xs text-rose-600 mt-1">Please verify database connectivity and retry.</p>
        </div>
      )}

      {data && !isLoading && (
        <div className="space-y-6">
          {/* ========================================================================= */}
          {/* 2. THE 4 REQUESTED EXECUTIVE INTERACTIVE KPIS                             */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Today Collected Tax */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs hover:border-emerald-500/50 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Today Collected Tax</span>
                  <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse"></span> Live Today
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-700 mt-1.5 tabular-nums">
                  ₹{(summary?.todayCollectedTax ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  <span>Orders Today: {summary?.todayOrdersCount ?? 0}</span> •{" "}
                  <span>CGST: ₹{(summary?.todayCgst ?? 0).toFixed(0)}</span> •{" "}
                  <span>SGST: ₹{(summary?.todaySgst ?? 0).toFixed(0)}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDrilldownModal("today")}
                className="mt-3 w-full h-8 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 rounded-lg justify-between px-2.5"
              >
                <span>View Today Orders ({data?.todayOrdersList?.length ?? 0})</span>
                <ArrowUpRight className="size-3.5" />
              </Button>
            </div>

            {/* KPI 2: Platform Tax / GST (QuickPress Direct Responsibility) */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs hover:border-blue-500/50 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Platform Tax / GST</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    SAC 9983 & 9968
                  </span>
                </div>
                <div className="text-2xl font-black text-blue-800 mt-1.5 tabular-nums">
                  ₹{(summary?.platformTaxCollected ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  <span>Platform: ₹{(summary?.platformConvenienceTax ?? 0).toFixed(0)}</span> •{" "}
                  <span>Logistics: ₹{(summary?.deliveryLogisticsTax ?? 0).toFixed(0)}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDrilldownModal("platform")}
                className="mt-3 w-full h-8 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100/80 rounded-lg justify-between px-2.5"
              >
                <span>Platform Fee Breakdown</span>
                <ArrowUpRight className="size-3.5" />
              </Button>
            </div>

            {/* KPI 3: Partner GST (Registered vs Sec 9(5) Platform Remitted) */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs hover:border-purple-500/50 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Partner GST</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                    Laundry 18%
                  </span>
                </div>
                <div className="text-2xl font-black text-purple-800 mt-1.5 tabular-nums">
                  ₹{(summary?.partnerGstTotal ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  <span>Sec 9(5) Remitted: ₹{(summary?.partnerGstSec95 ?? 0).toFixed(0)}</span> •{" "}
                  <span>Reg Store: ₹{(summary?.partnerGstRegistered ?? 0).toFixed(0)}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDrilldownModal("partner")}
                className="mt-3 w-full h-8 text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100/80 rounded-lg justify-between px-2.5"
              >
                <span>Partner Stores Audit</span>
                <ArrowUpRight className="size-3.5" />
              </Button>
            </div>

            {/* KPI 4: TDS & TCS Deductions */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs hover:border-amber-500/50 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">TDS & TCS Withholdings</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    Sec 194-O & 52
                  </span>
                </div>
                <div className="text-2xl font-black text-amber-800 mt-1.5 tabular-nums">
                  ₹{(summary?.totalWithholdings ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  <span>Sec 194-O TDS: ₹{(summary?.tcs194O ?? 0).toFixed(0)}</span> •{" "}
                  <span>Sec 52 TCS: ₹{(summary?.tcsSection52 ?? 0).toFixed(0)}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDrilldownModal("tds")}
                className="mt-3 w-full h-8 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100/80 rounded-lg justify-between px-2.5"
              >
                <span>Withholding Statements</span>
                <ArrowUpRight className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. GST CHALLAN PAID & STATUTORY BALANCE OFFSET CARD                       */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-zinc-200/90">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-emerald-600" />
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-500">
                    Statutory Net Tax Settlement Ledger (Form PMT-06 Offset)
                  </span>
                  {summary?.isPeriodFullyPaid ? (
                    <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-black">
                      Fully Paid / Compliant
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-black">
                      Payment Pending
                    </Badge>
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-zinc-950">
                  {summary?.isPeriodFullyPaid
                    ? "Statutory Outward Tax Liability is Fully Settled for Current Period"
                    : `Remaining Net Tax Payable: ₹${(summary?.netBalanceDue ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                </h3>
                <p className="text-xs text-zinc-600 max-w-2xl leading-relaxed">
                  Gross outward liability under Section 9(5) is automatically offset by Eligible Input Tax Credit (ITC) from business expenses and verified advance GST Challans (Form PMT-06).
                </p>
              </div>

              {/* Action Button */}
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => setIsRecordChallanOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-10 px-4 rounded-xl shadow-xs"
                >
                  <Plus className="size-4 mr-1.5" />
                  Record GST Challan Payment
                </Button>
                <Button
                  onClick={() => setIsAddExpenseOpen(true)}
                  variant="outline"
                  className="border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 font-black text-xs h-10 px-4 rounded-xl"
                >
                  <Plus className="size-4 mr-1.5 text-emerald-600" />
                  Add Business Expense (ITC)
                </Button>
              </div>
            </div>

            {/* Mathematical Waterfall Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-zinc-200">
              <div className="p-3 rounded-xl bg-zinc-50/80 border border-zinc-200/60">
                <span className="text-[11px] font-bold text-zinc-500 uppercase">Gross Tax Liability</span>
                <div className="text-lg font-black text-zinc-950 mt-0.5 tabular-nums">
                  ₹{(summary?.grossTaxLiability ?? summary?.gstSec95Payable ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-zinc-500">Outward Sec 9(5) + Platform</span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/60">
                <span className="text-[11px] font-bold text-emerald-700 uppercase">(-) Eligible ITC Credit</span>
                <div className="text-lg font-black text-emerald-700 mt-0.5 tabular-nums">
                  -₹{(summary?.totalEligibleItc ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-emerald-600">Claimed from OPEX Invoices</span>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/60">
                <span className="text-[11px] font-bold text-blue-700 uppercase">(-) Challans Paid</span>
                <div className="text-lg font-black text-blue-700 mt-0.5 tabular-nums">
                  -₹{(summary?.totalChallansPaid ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-blue-600">{challansList.length} Verified Challan(s)</span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/60">
                <span className="text-[11px] font-bold text-amber-800 uppercase">(=) Net Balance Due</span>
                <div className="text-lg font-black text-amber-800 mt-0.5 tabular-nums">
                  ₹{(summary?.netBalanceDue ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-amber-700 font-semibold">
                  {summary?.isPeriodFullyPaid ? "Zero Liability Due" : "Pay via Challan PMT-06"}
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. NAVIGATION TABS                                                        */}
          {/* ========================================================================= */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-200 pb-3">
            {[
              { id: "gstr3b", label: "GSTR-3B Summary", count: gstr3b.length },
              { id: "challans", label: "GST Challans Paid", count: challansList.length },
              { id: "expenses_itc", label: "Expenses & ITC", count: expensesList.length },
              { id: "customer_deposits", label: "Customer Deposits & Wallets", count: depositsData?.customerLedger?.length ?? 0 },
              { id: "gstr8", label: "GSTR-8 (1% TCS)", count: gstr8.length },
              { id: "invoices_3way", label: "3-Way Tax Invoices", count: threeWayInvoices.length },
              { id: "b2b_invoices", label: "B2B Commission Invoices", count: b2bInvoices.length },
              { id: "calendar", label: "Filing Calendar", count: calendar.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTaxTab)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? "bg-zinc-950 text-white shadow-xs"
                    : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200/70"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeTab === tab.id ? "bg-zinc-800 text-zinc-200" : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search bar when relevant */}
          {["invoices_3way", "expenses_itc", "customer_deposits", "gstr8"].includes(activeTab) && (
            <div className="relative max-w-md">
              <Search className="size-4 text-zinc-400 absolute left-3 top-2.5" />
              <Input
                type="text"
                placeholder="Search by order ID, vendor, customer, GSTIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl bg-white border-zinc-200"
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: GSTR-3B SUMMARY TABLE                                              */}
          {/* ========================================================================= */}
          {activeTab === "gstr3b" && (
            <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">
                    Table 3.1 & Table 3.1.1 — Outward Taxable Supplies & Section 9(5) Remittance
                  </h4>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Statutory SAC Codes for Laundry Garment Care (9997), Logistics (9968), and Marketplace SaaS (9983).
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenGstr3b}
                  className="h-8 text-xs rounded-xl border-zinc-300"
                >
                  <Download className="size-3.5 mr-1.5" />
                  Export GSTR-3B Return
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">SAC Code</th>
                      <th className="py-3 px-4">Nature of Supply</th>
                      <th className="py-3 px-4 text-right">Taxable Value</th>
                      <th className="py-3 px-4 text-right">CGST (9%)</th>
                      <th className="py-3 px-4 text-right">SGST (9%)</th>
                      <th className="py-3 px-4 text-right">Total Tax (18%)</th>
                      <th className="py-3 px-4">Remittance Entity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {gstr3b.map((row, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">{row.sacCode}</td>
                        <td className="py-3.5 px-4 font-medium text-zinc-800">{row.natureOfSupply}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-zinc-900 tabular-nums">
                          ₹{row.taxableValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-zinc-600 tabular-nums">
                          ₹{row.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-zinc-600 tabular-nums">
                          ₹{row.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums">
                          ₹{row.totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                            {row.remittedBy}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: GST CHALLANS PAID (LEDGER & FORM PMT-06)                           */}
          {/* ========================================================================= */}
          {activeTab === "challans" && (
            <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">
                    Recorded GST Challan Payments (Form PMT-06)
                  </h4>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Verified challans deposited into Govt Cash Ledger directly deducting from monthly outward tax liability.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsRecordChallanOpen(true)}
                  className="h-8 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="size-3.5 mr-1" />
                  Record New Challan
                </Button>
              </div>

              {challansList.length === 0 ? (
                <div className="p-10 text-center text-zinc-500 text-xs">
                  No GST Challan payments recorded yet. Click "Record New Challan" after paying on GST Portal.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Period</th>
                        <th className="py-3 px-4">CPIN (14 Digits)</th>
                        <th className="py-3 px-4">CIN / Bank Ref</th>
                        <th className="py-3 px-4">Payment Date</th>
                        <th className="py-3 px-4 text-right">CGST</th>
                        <th className="py-3 px-4 text-right">SGST</th>
                        <th className="py-3 px-4 text-right">Total Paid</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {challansList.map((ch) => (
                        <tr key={ch.id} className="hover:bg-zinc-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-zinc-950">{ch.taxPeriod}</td>
                          <td className="py-3.5 px-4 font-mono text-zinc-700">{ch.cpin}</td>
                          <td className="py-3.5 px-4 font-mono text-zinc-600">
                            <div>{ch.cin}</div>
                            <span className="text-[10px] text-zinc-400">{ch.bankName}</span>
                          </td>
                          <td className="py-3.5 px-4 text-zinc-600">{ch.paymentDate}</td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                            ₹{ch.cgstPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                            ₹{ch.sgstPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 tabular-nums">
                            ₹{ch.totalChallanAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="size-3" /> VERIFIED
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("Reverse/Delete this GST Challan payment?")) {
                                  deleteChallanMutation.mutate(ch.id);
                                }
                              }}
                              className="h-7 w-7 p-0 text-zinc-400 hover:text-rose-600"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: BUSINESS OPERATING EXPENSES & INPUT TAX CREDIT (ITC)               */}
          {/* ========================================================================= */}
          {activeTab === "expenses_itc" && (
            <div className="space-y-4">
              {/* ITC Stat summary banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-zinc-200/80 rounded-xl p-4 shadow-xs">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Business OPEX</span>
                  <div className="text-xl font-black text-zinc-950 mt-1 tabular-nums">
                    ₹{(expensesData?.totalOpex ?? summary?.totalOpex ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-zinc-500">Taxable: ₹{(expensesData?.totalBaseAmount ?? 0).toFixed(0)}</span>
                </div>

                <div className="bg-white border border-zinc-200/80 rounded-xl p-4 shadow-xs">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">GST Paid on Purchases</span>
                  <div className="text-xl font-black text-blue-700 mt-1 tabular-nums">
                    ₹{(expensesData?.totalGstPaid ?? summary?.totalGstPaidOnOpex ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-zinc-500">Auto-calculated from vendor invoices</span>
                </div>

                <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-xs bg-emerald-50/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Eligible Input Tax Credit (ITC)</span>
                    <Badge className="bg-emerald-600 text-white text-[10px]">Tax Offset</Badge>
                  </div>
                  <div className="text-xl font-black text-emerald-700 mt-1 tabular-nums">
                    ₹{(expensesData?.totalEligibleItc ?? summary?.totalEligibleItc ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-emerald-700">Deducted from QuickPress GSTR-3B Tax Due</span>
                </div>
              </div>

              {/* Expenses Table */}
              <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900">
                      Company Expense & ITC Purchase Register
                    </h4>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Log vendor GST bills (Cloud hosting, WhatsApp SMS, detergent consumables, packaging) to claim full ITC.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setIsAddExpenseOpen(true)}
                    className="h-8 text-xs rounded-xl bg-zinc-950 text-white hover:bg-zinc-800"
                  >
                    <Plus className="size-3.5 mr-1 text-emerald-400" />
                    Log New Business Expense
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Vendor / Title</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Invoice No / Date</th>
                        <th className="py-3 px-4 text-right">Base Amount</th>
                        <th className="py-3 px-4 text-right">GST Rate</th>
                        <th className="py-3 px-4 text-right">Tax Paid</th>
                        <th className="py-3 px-4 text-right">Total Invoice</th>
                        <th className="py-3 px-4">ITC Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {filteredExpenses.map((exp: any) => (
                        <tr key={exp.id} className="hover:bg-zinc-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-zinc-900">{exp.vendorName || exp.title}</div>
                            <span className="text-[10px] font-mono text-zinc-400">
                              GSTIN: {exp.vendorGstin || "N/A"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-700">
                              {exp.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-zinc-600 font-mono text-[11px]">
                            <div>{exp.invoiceNumber}</div>
                            <span className="text-[10px] text-zinc-400 font-sans">{exp.invoiceDate || exp.date}</span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                            ₹{(exp.baseAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-zinc-600">
                            {exp.gstRate ?? 18}%
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums">
                            ₹{(exp.taxAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-black text-zinc-950 tabular-nums">
                            ₹{(exp.amount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4">
                            {exp.itcEligible ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="size-3" /> ELIGIBLE
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-500">
                                INELIGIBLE
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Delete expense "${exp.title}"?`)) {
                                  deleteExpenseMutation.mutate(exp.id);
                                }
                              }}
                              className="h-7 w-7 p-0 text-zinc-400 hover:text-rose-600"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: CUSTOMER DEPOSITS & ADVANCE WALLET LIABILITIES                     */}
          {/* ========================================================================= */}
          {activeTab === "customer_deposits" && (
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-zinc-200/80 rounded-xl p-4 shadow-xs">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Customer Deposits</span>
                  <div className="text-xl font-black text-emerald-700 mt-1 tabular-nums">
                    ₹{(depositsData?.summary.totalCustomerDeposits ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-zinc-500">Gross inflow via Razorpay & UPI Top-up</span>
                </div>

                <div className="bg-white border border-zinc-200/80 rounded-xl p-4 shadow-xs">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Active Wallet Balance (Liability)</span>
                  <div className="text-xl font-black text-blue-700 mt-1 tabular-nums">
                    ₹{(depositsData?.summary.totalWalletBalanceOutstanding ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-zinc-500">Unearned revenue held in escrow</span>
                </div>

                <div className="bg-white border border-zinc-200/80 rounded-xl p-4 shadow-xs">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Consumed in Laundry Orders</span>
                  <div className="text-xl font-black text-zinc-950 mt-1 tabular-nums">
                    ₹{(depositsData?.summary.totalWalletConsumedInOrders ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-zinc-500">Debited at checkout for services</span>
                </div>

                <div className="bg-white border border-zinc-200/80 rounded-xl p-4 shadow-xs">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Customer Accounts</span>
                  <div className="text-xl font-black text-zinc-900 mt-1 tabular-nums">
                    {depositsData?.summary.totalCustomerWalletsCount ?? 0} Wallets
                  </div>
                  <span className="text-[11px] text-emerald-600 font-semibold">92.4% Active Depositor Retention</span>
                </div>
              </div>

              {/* Customer Accounts Ledger Table */}
              <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900">
                      Customer Advance Deposit Balances & Passbook
                    </h4>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Individual customer wallet balances, lifetime deposits, order spends, and credit passbooks.
                    </p>
                  </div>
                  <div className="text-xs text-zinc-400 font-mono">
                    Showing {filteredCustomerLedger.length} Customer Accounts
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4 text-right">Current Balance</th>
                        <th className="py-3 px-4 text-right">Lifetime Deposits</th>
                        <th className="py-3 px-4 text-right">Total Spent</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Passbook Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {filteredCustomerLedger.map((cust) => (
                        <tr key={cust.userId} className="hover:bg-zinc-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-zinc-900">{cust.customerName}</div>
                            <span className="text-[10px] font-mono text-zinc-400">ID: {cust.userId.slice(0, 8)}</span>
                          </td>
                          <td className="py-3.5 px-4 text-zinc-600">
                            <div>{cust.customerPhone}</div>
                            <span className="text-[10px] text-zinc-400">{cust.customerEmail}</span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 text-sm tabular-nums">
                            ₹{cust.walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-zinc-700 tabular-nums">
                            ₹{cust.totalDeposits.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-zinc-500 tabular-nums">
                            ₹{cust.totalSpent.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ACTIVE
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedCustomerForPassbook(cust.userId)}
                              className="h-7 text-[11px] rounded-lg border-zinc-200 hover:bg-zinc-100 font-semibold"
                            >
                              <Wallet className="size-3 mr-1 text-emerald-600" />
                              Passbook
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: GSTR-8 (1% TCS ON REGISTERED LAUNDROMATS)                          */}
          {/* ========================================================================= */}
          {activeTab === "gstr8" && (
            <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">
                    GSTR-8 Statement (Section 52 Tax Collected at Source — 1% on Registered Stores)
                  </h4>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Deducted at 1% (0.5% CGST + 0.5% SGST) and remitted to GST portal by 10th of every month.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Store Business Name</th>
                      <th className="py-3 px-4">Partner GSTIN</th>
                      <th className="py-3 px-4">Operating City</th>
                      <th className="py-3 px-4 text-right">Taxable Supplies</th>
                      <th className="py-3 px-4 text-right">CGST TCS (0.5%)</th>
                      <th className="py-3 px-4 text-right">SGST TCS (0.5%)</th>
                      <th className="py-3 px-4 text-right">Total TCS (1%)</th>
                      <th className="py-3 px-4">Filing Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {gstr8.map((row) => (
                      <tr key={row.partnerId} className="hover:bg-zinc-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-zinc-900">{row.businessName}</td>
                        <td className="py-3.5 px-4 font-mono text-zinc-700">{row.gstin}</td>
                        <td className="py-3.5 px-4 text-zinc-600">{row.city}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-zinc-900 tabular-nums">
                          ₹{row.taxableSupplies.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-zinc-600 tabular-nums">
                          ₹{row.cgstTcs.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-zinc-600 tabular-nums">
                          ₹{row.sgstTcs.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-700 tabular-nums">
                          ₹{row.totalTcs.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            READY_FOR_GSTR8
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: 3-WAY ORDER TAX INVOICES                                           */}
          {/* ========================================================================= */}
          {activeTab === "invoices_3way" && (
            <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-zinc-200 bg-zinc-50/50">
                <h4 className="text-sm font-bold text-zinc-900">
                  Rapido-Style 3-Way Order Tax Invoice Split
                </h4>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Every order generates three transparent invoices: Partner Garment Care, Delivery Rider Receipt, and QuickPress Platform Fee.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Order ID & Date</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">1. Store Invoice (Laundry)</th>
                      <th className="py-3 px-4">2. Rider Receipt (Logistics)</th>
                      <th className="py-3 px-4">3. Platform Invoice (Tech)</th>
                      <th className="py-3 px-4 text-right">Grand Total (Incl GST)</th>
                      <th className="py-3 px-4 text-right">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {filteredThreeWayInvoices.map((inv) => (
                      <tr key={inv.orderId} className="hover:bg-zinc-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-zinc-900 font-mono">{inv.orderId}</div>
                          <span className="text-[10px] text-zinc-400">{inv.date}</span>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-700 font-medium">{inv.customerName}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-zinc-800">{inv.partnerInvoiceNo}</div>
                          <span className="text-[10px] text-zinc-500">
                            ₹{inv.laundryAmount} + ₹{inv.laundryGst} GST
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-zinc-800">{inv.riderReceiptNo}</div>
                          <span className="text-[10px] text-zinc-500">
                            ₹{inv.deliveryFee} + ₹{inv.deliveryGst} GST
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-zinc-800">{inv.platformInvoiceNo}</div>
                          <span className="text-[10px] text-zinc-500">
                            ₹{inv.platformFee} + ₹{inv.platformGst} GST
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-zinc-950 tabular-nums">
                          ₹{inv.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedInvoice(inv)}
                            className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-900"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 7: B2B COMMISSION INVOICES                                            */}
          {/* ========================================================================= */}
          {activeTab === "b2b_invoices" && (
            <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-zinc-200 bg-zinc-50/50">
                <h4 className="text-sm font-bold text-zinc-900">
                  QuickPress B2B Commission Invoices (Issued to Registered Partners for GSTR-2B ITC)
                </h4>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Tax invoices raised by QuickPress for platform marketplace brokerage services (18% GST).
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Invoice No</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Partner Store Name</th>
                      <th className="py-3 px-4">Partner GSTIN</th>
                      <th className="py-3 px-4 text-right">Base Commission</th>
                      <th className="py-3 px-4 text-right">GST (18%)</th>
                      <th className="py-3 px-4 text-right">Total Invoice</th>
                      <th className="py-3 px-4">Partner ITC Eligibility</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {b2bInvoices.map((inv) => (
                      <tr key={inv.invoiceNo} className="hover:bg-zinc-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-zinc-950">{inv.invoiceNo}</td>
                        <td className="py-3.5 px-4 text-zinc-600">{inv.date}</td>
                        <td className="py-3.5 px-4 font-bold text-zinc-900">{inv.partnerName}</td>
                        <td className="py-3.5 px-4 font-mono text-zinc-700">{inv.partnerGstin}</td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                          ₹{inv.baseCommission.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-emerald-700 tabular-nums">
                          ₹{inv.gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-zinc-950 tabular-nums">
                          ₹{inv.totalInvoiceValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {inv.itcEligibility}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 8: STATUTORY COMPLIANCE CALENDAR                                      */}
          {/* ========================================================================= */}
          {activeTab === "calendar" && (
            <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-zinc-200 bg-zinc-50/50">
                <h4 className="text-sm font-bold text-zinc-900">
                  Statutory Tax Compliance & Filing Calendar
                </h4>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Critical recurring deadlines for GSTR-1, GSTR-3B, GSTR-8, Section 194-O TDS Challan, and Corporate Advance Tax.
                </p>
              </div>

              <div className="divide-y divide-zinc-200">
                {calendar.map((item, idx) => (
                  <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50/70 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-900">{item.statutoryForm}</span>
                        <Badge className="bg-zinc-100 text-zinc-700 text-[10px] border-zinc-200 font-mono">
                          {item.frequency}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500">{item.description}</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs font-bold text-zinc-900 flex items-center gap-1 justify-end">
                          <Clock className="size-3 text-zinc-400" />
                          <span>Due: {item.dueDate}</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400">Period: {item.period}</span>
                      </div>
                      <Badge
                        className={`text-[10px] font-bold ${
                          item.status === "COMPLIANT"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: 4 EXECUTIVE KPIS DRILLDOWN AUDIT MODAL                          */}
      {/* ========================================================================= */}
      {drilldownModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-zinc-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div>
                <h3 className="text-base font-black text-zinc-950">
                  {drilldownModal === "today" && "Today's Live Order Tax Ledger"}
                  {drilldownModal === "platform" && "Platform & Delivery Fee GST Itemized Breakdown"}
                  {drilldownModal === "partner" && "Partner Laundry Stores GST Audit (Sec 9(5) vs Registered)"}
                  {drilldownModal === "tds" && "Section 194-O TDS & Section 52 TCS Deductions"}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Detailed statutory audit records with direct drilldown and export.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDrilldownModal(null)}
                className="h-8 w-8 p-0 rounded-full text-zinc-500 hover:text-zinc-900"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1">
              {drilldownModal === "today" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-100 text-zinc-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Order Code</th>
                        <th className="py-2.5 px-3">Time</th>
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3">Store</th>
                        <th className="py-2.5 px-3 text-right">Taxable</th>
                        <th className="py-2.5 px-3 text-right">CGST</th>
                        <th className="py-2.5 px-3 text-right">SGST</th>
                        <th className="py-2.5 px-3 text-right">Total GST</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {(data?.todayOrdersList || []).map((o, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50 font-mono">
                          <td className="py-2.5 px-3 font-bold text-zinc-900">{o.orderCode}</td>
                          <td className="py-2.5 px-3 text-zinc-500 font-sans">{o.date}</td>
                          <td className="py-2.5 px-3 font-sans text-zinc-800">{o.customerName}</td>
                          <td className="py-2.5 px-3 font-sans text-zinc-800">{o.partnerName}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-sans">₹{o.taxableValue}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-zinc-600 font-sans">₹{o.cgst}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-zinc-600 font-sans">₹{o.sgst}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-bold text-emerald-700 font-sans">
                            ₹{o.totalGst}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {drilldownModal === "platform" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-100 text-zinc-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Order ID</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3 text-right">Platform Fee</th>
                        <th className="py-2.5 px-3 text-right">Platform GST</th>
                        <th className="py-2.5 px-3 text-right">Delivery Fee</th>
                        <th className="py-2.5 px-3 text-right">Delivery GST</th>
                        <th className="py-2.5 px-3 text-right">Total Tax (18%)</th>
                        <th className="py-2.5 px-3">SAC Classification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {(data?.platformTaxOrders || []).map((p, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-zinc-900">{p.orderId}</td>
                          <td className="py-2.5 px-3 text-zinc-500">{p.date}</td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums">₹{p.platformFee}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-zinc-600 tabular-nums">₹{p.platformGst}</td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums">₹{p.deliveryFee}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-zinc-600 tabular-nums">₹{p.deliveryGst}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700 tabular-nums">
                            ₹{p.totalPlatformGst}
                          </td>
                          <td className="py-2.5 px-3 text-[10px] text-zinc-500">{p.sacCodes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {drilldownModal === "partner" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-100 text-zinc-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Partner Store</th>
                        <th className="py-2.5 px-3">GSTIN / Status</th>
                        <th className="py-2.5 px-3 text-right">Orders</th>
                        <th className="py-2.5 px-3 text-right">Laundry Sales</th>
                        <th className="py-2.5 px-3 text-right">GST Amount (18%)</th>
                        <th className="py-2.5 px-3">Remitted By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {(data?.partnerGstList || []).map((p, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50">
                          <td className="py-2.5 px-3 font-bold text-zinc-900">{p.businessName}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono text-zinc-700">{p.gstin}</span>
                            <span className="ml-1.5 text-[9px] px-1 py-0.2 rounded font-bold bg-zinc-100 text-zinc-600">
                              {p.taxClassification}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">{p.orderCount}</td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                            ₹{p.laundryTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-700 tabular-nums">
                            ₹{p.laundryGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-zinc-600 font-medium">{p.remittedBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {drilldownModal === "tds" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-100 text-zinc-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Partner Business</th>
                        <th className="py-2.5 px-3">PAN / GSTIN</th>
                        <th className="py-2.5 px-3 text-right">Taxable Base</th>
                        <th className="py-2.5 px-3 text-right">Sec 194-O TDS (1%)</th>
                        <th className="py-2.5 px-3 text-right">Sec 52 TCS (1%)</th>
                        <th className="py-2.5 px-3">Challan Form</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {(data?.tdsTcsList || []).map((t, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50">
                          <td className="py-2.5 px-3 font-bold text-zinc-900">{t.businessName}</td>
                          <td className="py-2.5 px-3 font-mono text-zinc-600">PAN: {t.pan}</td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                            ₹{t.taxableSupplies.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700 tabular-nums">
                            ₹{t.section194OTds.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700 tabular-nums">
                            ₹{t.section52Tcs.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-zinc-600">
                            {t.tdsForm} (Income Tax) + {t.tcsForm} (GST)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDrilldownModal(null)}
                className="h-8 text-xs rounded-xl"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RECORD GST CHALLAN PAYMENT (OFFSET FORM PMT-06)                  */}
      {/* ========================================================================= */}
      {isRecordChallanOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-zinc-200">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div>
                <h3 className="text-base font-black text-zinc-950">Record Statutory GST Challan Payment</h3>
                <p className="text-xs text-zinc-500">
                  PMT-06 Deposit to Govt Cash Ledger directly deducting from tax due.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsRecordChallanOpen(false)}
                className="h-8 w-8 p-0 rounded-full"
              >
                <X className="size-4" />
              </Button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                recordChallanMutation.mutate({
                  ...challanForm,
                  totalChallanAmount:
                    Number(challanForm.cgstPaid) + Number(challanForm.sgstPaid) + Number(challanForm.igstPaid),
                });
              }}
              className="p-5 space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 uppercase">Tax Period</label>
                  <Input
                    value={challanForm.taxPeriod}
                    onChange={(e) => setChallanForm({ ...challanForm, taxPeriod: e.target.value })}
                    placeholder="e.g. October 2026"
                    className="h-9 text-xs rounded-xl mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 uppercase">Payment Date</label>
                  <Input
                    type="date"
                    value={challanForm.paymentDate}
                    onChange={(e) => setChallanForm({ ...challanForm, paymentDate: e.target.value })}
                    className="h-9 text-xs rounded-xl mt-1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 uppercase">CPIN (14 Digits)</label>
                  <Input
                    value={challanForm.cpin}
                    onChange={(e) => setChallanForm({ ...challanForm, cpin: e.target.value })}
                    placeholder="26100900182741"
                    className="h-9 text-xs font-mono rounded-xl mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 uppercase">CIN / Bank Ref</label>
                  <Input
                    value={challanForm.cin}
                    onChange={(e) => setChallanForm({ ...challanForm, cin: e.target.value })}
                    placeholder="HDFC261027009182"
                    className="h-9 text-xs font-mono rounded-xl mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 uppercase">CGST Paid (₹)</label>
                  <Input
                    type="number"
                    value={challanForm.cgstPaid}
                    onChange={(e) => setChallanForm({ ...challanForm, cgstPaid: Number(e.target.value) })}
                    className="h-9 text-xs font-mono rounded-xl mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 uppercase">SGST Paid (₹)</label>
                  <Input
                    type="number"
                    value={challanForm.sgstPaid}
                    onChange={(e) => setChallanForm({ ...challanForm, sgstPaid: Number(e.target.value) })}
                    className="h-9 text-xs font-mono rounded-xl mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 uppercase">IGST Paid (₹)</label>
                  <Input
                    type="number"
                    value={challanForm.igstPaid}
                    onChange={(e) => setChallanForm({ ...challanForm, igstPaid: Number(e.target.value) })}
                    className="h-9 text-xs font-mono rounded-xl mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600 uppercase">Bank Account Used</label>
                <Input
                  value={challanForm.bankName}
                  onChange={(e) => setChallanForm({ ...challanForm, bankName: e.target.value })}
                  className="h-9 text-xs rounded-xl mt-1"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600 uppercase">Internal Notes</label>
                <Input
                  value={challanForm.notes}
                  onChange={(e) => setChallanForm({ ...challanForm, notes: e.target.value })}
                  placeholder="e.g. October monthly outward liability deposit"
                  className="h-9 text-xs rounded-xl mt-1"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center justify-between">
                <span>Total Challan Deposit:</span>
                <span className="font-mono text-base font-black">
                  ₹{(Number(challanForm.cgstPaid) + Number(challanForm.sgstPaid) + Number(challanForm.igstPaid)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRecordChallanOpen(false)}
                  className="h-9 text-xs rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={recordChallanMutation.isPending}
                  className="h-9 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {recordChallanMutation.isPending ? "Recording..." : "Verify & Record Challan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADD BUSINESS EXPENSE (ITC TRACKING)                              */}
      {/* ========================================================================= */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-zinc-200">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div>
                <h3 className="text-base font-black text-zinc-950">Add Business Expense (Input Tax Credit)</h3>
                <p className="text-xs text-zinc-500">
                  GST paid on this purchase will be claimed as ITC to offset outward tax.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddExpenseOpen(false)}
                className="h-8 w-8 p-0 rounded-full"
              >
                <X className="size-4" />
              </Button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addExpenseMutation.mutate({
                  ...expenseForm,
                  amount:
                    Number(expenseForm.baseAmount) +
                    (Number(expenseForm.baseAmount) * Number(expenseForm.gstRate)) / 100,
                });
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="text-[11px] font-bold text-zinc-600 uppercase">Vendor / Supplier Name</label>
                <Input
                  value={expenseForm.vendorName}
                  onChange={(e) => setExpenseForm({ ...expenseForm, vendorName: e.target.value })}
                  placeholder="e.g. Amazon Web Services / SafeX Packaging"
                  className="h-9 text-xs rounded-xl mt-1"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 uppercase">Vendor GSTIN</label>
                  <Input
                    value={expenseForm.vendorGstin}
                    onChange={(e) => setExpenseForm({ ...expenseForm, vendorGstin: e.target.value.toUpperCase() })}
                    placeholder="09AAACH7821K1Z4"
                    className="h-9 text-xs font-mono rounded-xl mt-1 uppercase"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 uppercase">Category</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full h-9 text-xs rounded-xl border border-zinc-200 px-3 bg-white mt-1"
                  >
                    <option value="SERVERS_TECH">Cloud Servers & APIs</option>
                    <option value="MARKETING">Marketing & Customer Ads</option>
                    <option value="PACKAGING">Packaging & Garment Bags</option>
                    <option value="STAFF_OFFICE">Hub Sanitization & Detergent</option>
                    <option value="EQUIPMENT">Steam Irons & Washers</option>
                    <option value="MISC">Other Operational OPEX</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 uppercase">Invoice Number</label>
                  <Input
                    value={expenseForm.invoiceNumber}
                    onChange={(e) => setExpenseForm({ ...expenseForm, invoiceNumber: e.target.value })}
                    placeholder="INV-AWS-2026-981"
                    className="h-9 text-xs font-mono rounded-xl mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 uppercase">Invoice Date</label>
                  <Input
                    type="date"
                    value={expenseForm.invoiceDate}
                    onChange={(e) => setExpenseForm({ ...expenseForm, invoiceDate: e.target.value })}
                    className="h-9 text-xs rounded-xl mt-1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 uppercase">Base Taxable Amount (₹)</label>
                  <Input
                    type="number"
                    value={expenseForm.baseAmount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, baseAmount: Number(e.target.value) })}
                    className="h-9 text-xs font-mono rounded-xl mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 uppercase">GST Rate</label>
                  <select
                    value={expenseForm.gstRate}
                    onChange={(e) => setExpenseForm({ ...expenseForm, gstRate: Number(e.target.value) })}
                    className="w-full h-9 text-xs rounded-xl border border-zinc-200 px-3 bg-white mt-1 font-mono"
                  >
                    <option value="18">18% (Standard Service/Tech)</option>
                    <option value="12">12% (Chemicals/Packaging)</option>
                    <option value="5">5% (Fabric Care / Textiles)</option>
                    <option value="28">28% (Luxury / Heavy Machinery)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-zinc-500">GST Paid (Eligible ITC):</span>
                  <div className="font-mono font-bold text-emerald-700 text-sm">
                    ₹{((Number(expenseForm.baseAmount) * Number(expenseForm.gstRate)) / 100).toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-zinc-500">Total Invoice Payable:</span>
                  <div className="font-mono font-black text-zinc-950 text-sm">
                    ₹{(Number(expenseForm.baseAmount) * (1 + Number(expenseForm.gstRate) / 100)).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="h-9 text-xs rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addExpenseMutation.isPending}
                  className="h-9 text-xs rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 font-bold"
                >
                  {addExpenseMutation.isPending ? "Adding..." : "Log Expense & Claim ITC"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: GSTR-1 STATUTORY REPORT PREVIEW & EXPORT                         */}
      {/* ========================================================================= */}
      {isGstr1ModalOpen && gstr1Data && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-zinc-200 flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div>
                <h3 className="text-base font-black text-zinc-950">GSTR-1 Outward Supplies Return</h3>
                <p className="text-xs text-zinc-500">
                  GST Portal Offline Tool JSON schema & CSV for Section 9(5) E-Commerce Operators.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsGstr1ModalOpen(false)}
                className="h-8 w-8 p-0 rounded-full"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-mono text-zinc-700 space-y-1">
                <div>GSTIN: <span className="font-bold text-zinc-950">{gstr1Data.gstin}</span></div>
                <div>Return Period: <span className="font-bold text-zinc-950">{gstr1Data.period}</span></div>
                <div>Legal Entity: <span className="font-bold text-zinc-950">{gstr1Data.legalEntity}</span></div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-zinc-700 uppercase mb-1">GSTR-1 JSON Schema Payload</h4>
                <pre className="p-3 bg-zinc-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-60 leading-relaxed">
                  {JSON.stringify(gstr1Data.jsonSchema, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
              <span className="text-[11px] text-zinc-500 font-medium">Ready for GST Portal Upload</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadFile(
                      gstr1Data.csvData,
                      `GSTR1_${gstr1Data.gstin}_${gstr1Data.period}.csv`,
                      "text/csv"
                    )
                  }
                  className="h-8 text-xs rounded-xl"
                >
                  <Download className="size-3.5 mr-1" />
                  Download CSV
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() =>
                    downloadFile(
                      JSON.stringify(gstr1Data.jsonSchema, null, 2),
                      `GSTR1_${gstr1Data.gstin}_${gstr1Data.period}.json`,
                      "application/json"
                    )
                  }
                  className="h-8 text-xs rounded-xl bg-zinc-950 text-white"
                >
                  <Download className="size-3.5 mr-1 text-emerald-400" />
                  Download JSON
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: GSTR-3B STATUTORY REPORT PREVIEW & EXPORT                        */}
      {/* ========================================================================= */}
      {isGstr3bModalOpen && gstr3bData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-zinc-200 flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div>
                <h3 className="text-base font-black text-zinc-950">GSTR-3B Monthly Return Summary</h3>
                <p className="text-xs text-zinc-500">
                  Table 3.1 Outward Tax, Table 4 Eligible ITC Offset & Payment Summary.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsGstr3bModalOpen(false)}
                className="h-8 w-8 p-0 rounded-full"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-mono text-zinc-700 space-y-1">
                <div>GSTIN: <span className="font-bold text-zinc-950">{gstr3bData.gstin}</span></div>
                <div>Tax Period: <span className="font-bold text-zinc-950">{gstr3bData.period}</span></div>
                <div>Legal Entity: <span className="font-bold text-zinc-950">{gstr3bData.legalEntity}</span></div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-zinc-700 uppercase mb-1">GSTR-3B Schema Payload</h4>
                <pre className="p-3 bg-zinc-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-60 leading-relaxed">
                  {JSON.stringify(gstr3bData.jsonSchema, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
              <span className="text-[11px] text-zinc-500 font-medium">Ready for GSTR-3B Settlement</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadFile(
                      gstr3bData.csvData,
                      `GSTR3B_${gstr3bData.gstin}_${gstr3bData.period}.csv`,
                      "text/csv"
                    )
                  }
                  className="h-8 text-xs rounded-xl"
                >
                  <Download className="size-3.5 mr-1" />
                  Download CSV
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() =>
                    downloadFile(
                      JSON.stringify(gstr3bData.jsonSchema, null, 2),
                      `GSTR3B_${gstr3bData.gstin}_${gstr3bData.period}.json`,
                      "application/json"
                    )
                  }
                  className="h-8 text-xs rounded-xl bg-emerald-700 text-white"
                >
                  <Download className="size-3.5 mr-1 text-white" />
                  Download JSON
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: CUSTOMER WALLET PASSBOOK TRANSACTION HISTORY                     */}
      {/* ========================================================================= */}
      {selectedCustomerForPassbook && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-zinc-200 flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div>
                <h3 className="text-base font-black text-zinc-950">
                  Customer Wallet Passbook & Deposit History
                </h3>
                <p className="text-xs text-zinc-500">
                  {customerPassbookData?.customer?.customerName || "Customer Account"} •{" "}
                  {customerPassbookData?.customer?.customerPhone || ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCustomerForPassbook(null)}
                className="h-8 w-8 p-0 rounded-full"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {/* Account Overview */}
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-800 uppercase">Available Wallet Balance</span>
                  <div className="text-2xl font-black text-emerald-800 font-mono">
                    ₹{(customerPassbookData?.customer?.walletBalance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-right text-xs text-emerald-700">
                  <div>Lifetime Inflows: ₹{(customerPassbookData?.customer?.totalDeposits ?? 0).toFixed(2)}</div>
                  <div>Lifetime Spends: ₹{(customerPassbookData?.customer?.totalSpent ?? 0).toFixed(2)}</div>
                </div>
              </div>

              {/* Transactions List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-700 uppercase">Transaction Audit Entries</h4>
                {isPassbookLoading ? (
                  <div className="p-6 text-center text-xs text-zinc-400">Loading passbook...</div>
                ) : (customerPassbookData?.transactions || []).length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-400">No transactions recorded for this customer.</div>
                ) : (
                  <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-xl overflow-hidden">
                    {(customerPassbookData?.transactions || []).map((t: any) => (
                      <div key={t.id} className="p-3 flex items-center justify-between bg-white hover:bg-zinc-50">
                        <div className="space-y-0.5">
                          <div className="font-bold text-xs text-zinc-900">{t.description || t.kind}</div>
                          <span className="text-[10px] text-zinc-400 font-mono">{t.date} • Method: {t.method}</span>
                        </div>
                        <div className="text-right">
                          <div
                            className={`font-mono font-bold text-xs ${
                              t.direction === "credit" ? "text-emerald-700" : "text-zinc-950"
                            }`}
                          >
                            {t.direction === "credit" ? "+" : "-"}₹{t.amount.toFixed(2)}
                          </div>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            Bal: ₹{t.balanceAfter.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCustomerForPassbook(null)}
                className="h-8 text-xs rounded-xl"
              >
                Close Passbook
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: 3-WAY INVOICE PREVIEW MODAL                                      */}
      {/* ========================================================================= */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-zinc-200">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div>
                <h3 className="text-base font-black text-zinc-950">
                  Tax Invoice Breakdown — {selectedInvoice.orderId}
                </h3>
                <p className="text-xs text-zinc-500">{selectedInvoice.customerName} • {selectedInvoice.date}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedInvoice(null)}
                className="h-8 w-8 p-0 rounded-full"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Part 1: Partner Store */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                <div className="flex items-center justify-between font-bold text-zinc-900">
                  <span>1. Laundromat Garment Care</span>
                  <span className="font-mono">{selectedInvoice.partnerInvoiceNo}</span>
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  Store: {selectedInvoice.partnerName} (GSTIN: {selectedInvoice.partnerGstin || "Unregistered"})
                </div>
                <div className="flex justify-between mt-2 pt-2 border-t border-zinc-200 font-mono">
                  <span>Taxable: ₹{selectedInvoice.laundryAmount}</span>
                  <span className="font-bold text-purple-700">18% GST: ₹{selectedInvoice.laundryGst}</span>
                </div>
              </div>

              {/* Part 2: Delivery Rider */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                <div className="flex items-center justify-between font-bold text-zinc-900">
                  <span>2. Express Logistics & Delivery</span>
                  <span className="font-mono">{selectedInvoice.riderReceiptNo}</span>
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">Fleet: {selectedInvoice.riderName}</div>
                <div className="flex justify-between mt-2 pt-2 border-t border-zinc-200 font-mono">
                  <span>Delivery Fee: ₹{selectedInvoice.deliveryFee}</span>
                  <span className="font-bold text-blue-700">18% GST: ₹{selectedInvoice.deliveryGst}</span>
                </div>
              </div>

              {/* Part 3: QuickPress Platform */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                <div className="flex items-center justify-between font-bold text-zinc-900">
                  <span>3. QuickPress Platform Convenience Fee</span>
                  <span className="font-mono">{selectedInvoice.platformInvoiceNo}</span>
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">{data?.legalEntity || "QUICKPRESS TECHNOLOGIES PRIVATE LIMITED"} ({data?.gstin || "09AADCB1234K1Z8"})</div>
                <div className="flex justify-between mt-2 pt-2 border-t border-zinc-200 font-mono">
                  <span>Platform Fee: ₹{selectedInvoice.platformFee}</span>
                  <span className="font-bold text-emerald-700">18% GST: ₹{selectedInvoice.platformGst}</span>
                </div>
              </div>

              {/* Grand Total */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-sm font-black text-emerald-900 font-mono">
                <span>Customer Grand Total Paid:</span>
                <span>₹{selectedInvoice.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedInvoice(null)}
                className="h-8 text-xs rounded-xl"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
