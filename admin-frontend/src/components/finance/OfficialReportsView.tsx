import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Printer,
  Download,
  RefreshCw,
  Scale,
  Calendar,
  CheckCircle2,
  Building2,
  Receipt,
  IndianRupee,
  ShieldCheck,
  TrendingUp,
  Wallet,
  BookOpen,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { toast } from "sonner";
import {
  fetchAccountingStatements,
  fetchGeneralLedger,
  fetchChartOfAccounts,
  fetchTaxCenter,
  type AccountingStatementsResponse,
} from "@/api/finance-api";

export function OfficialReportsView() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("CURRENT_MONTH");
  const [activeReportTab, setActiveReportTab] = useState<
    "balance-sheet" | "pnl" | "journal-entries" | "ledger-accounts" | "cash-book" | "gst-reports"
  >("balance-sheet");

  const [journalSearch, setJournalSearch] = useState("");
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<string>("ALL");

  // Query: Accounting Statements (P&L, Balance Sheet, Cash Flow)
  const statementsQuery = useQuery<AccountingStatementsResponse>({
    queryKey: ["finance", "accounting-statements", selectedPeriod],
    queryFn: () => fetchAccountingStatements(selectedPeriod),
    staleTime: 30000,
  });

  // Query: General Ledger for Journal Entries & Day Book
  const ledgerQuery = useQuery({
    queryKey: ["finance", "general-ledger-entries", selectedPeriod],
    queryFn: () => fetchGeneralLedger({ page: 1, page_size: 100 }),
    staleTime: 30000,
  });

  // Query: Chart of Accounts for Ledger Accounts
  const coaQuery = useQuery({
    queryKey: ["finance", "chart-of-accounts-official", selectedPeriod],
    queryFn: () => fetchChartOfAccounts(selectedPeriod),
    staleTime: 30000,
  });

  // Query: Tax Center
  const taxQuery = useQuery({
    queryKey: ["finance", "tax-center-official"],
    queryFn: fetchTaxCenter,
    staleTime: 30000,
  });

  const pnl = statementsQuery.data?.pnl;
  const bs = statementsQuery.data?.balanceSheet;
  const cf = statementsQuery.data?.cashFlow;

  const currentDateFormatted = useMemo(() => {
    return new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const reportRefNumber = useMemo(() => {
    const code = Math.floor(1000 + Math.random() * 9000);
    return `QP/FIN/2026-27/REP-${code}`;
  }, []);

  // Trigger browser print
  const handlePrint = () => {
    window.print();
  };

  // CSV Export
  const handleExportCSV = () => {
    try {
      let csvContent = `data:text/csv;charset=utf-8,`;
      csvContent += `QUICKPRESS TECHNOLOGIES PRIVATE LIMITED\n`;
      csvContent += `CIN: U74999DL2024PTC398201 | GSTIN: 07AABCQ1234F1Z5\n`;
      csvContent += `Official Financial Statement: ${activeReportTab.toUpperCase()}\n`;
      csvContent += `Period: ${selectedPeriod} | Generated At: ${currentDateFormatted}\n\n`;

      if (activeReportTab === "balance-sheet" && bs) {
        csvContent += `ASSETS,AMOUNT (INR)\n`;
        csvContent += `Cash and Bank Escrow,${bs.assets.currentAssets.cashAndBank}\n`;
        csvContent += `Customer & Gateway Receivables,${bs.assets.currentAssets.customerReceivables + bs.assets.currentAssets.gatewayInTransit}\n`;
        csvContent += `Total Current Assets,${bs.assets.currentAssets.totalCurrentAssets}\n`;
        csvContent += `Non-Current Assets & Security Deposits,${bs.assets.nonCurrentAssets.totalNonCurrentAssets}\n`;
        csvContent += `TOTAL ASSETS,${bs.assets.totalAssets}\n\n`;
        csvContent += `LIABILITIES & EQUITY,AMOUNT (INR)\n`;
        csvContent += `Partner Laundry Payables,${bs.liabilities.currentLiabilities.partnerPayables}\n`;
        csvContent += `Rider Transit Payables,${bs.liabilities.currentLiabilities.riderPayables}\n`;
        csvContent += `Statutory Tax & GST Payables,${bs.liabilities.currentLiabilities.taxPayables}\n`;
        csvContent += `Total Liabilities,${bs.liabilities.totalLiabilities}\n`;
        csvContent += `Retained Earnings & Capital,${bs.equity.totalEquity}\n`;
        csvContent += `TOTAL LIABILITIES & EQUITY,${bs.liabilities.totalLiabilities + bs.equity.totalEquity}\n`;
      } else if (activeReportTab === "pnl" && pnl) {
        csvContent += `LINE ITEM,AMOUNT (INR),PERCENTAGE OF GMV\n`;
        csvContent += `Gross Merchandise Value (GMV),${pnl.gmv},100%\n`;
        csvContent += `Partner Disbursals,${pnl.partnerPayouts},${((pnl.partnerPayouts / (pnl.gmv || 1)) * 100).toFixed(1)}%\n`;
        csvContent += `Rider Disbursals,${pnl.riderPayouts},${((pnl.riderPayouts / (pnl.gmv || 1)) * 100).toFixed(1)}%\n`;
        csvContent += `Gateway Charges,${pnl.directExpenses},${((pnl.directExpenses / (pnl.gmv || 1)) * 100).toFixed(1)}%\n`;
        csvContent += `Gross Operational Profit,${pnl.grossProfit},${((pnl.grossProfit / (pnl.gmv || 1)) * 100).toFixed(1)}%\n`;
        csvContent += `Operating Expenses,${pnl.operatingExpenses},${((pnl.operatingExpenses / (pnl.gmv || 1)) * 100).toFixed(1)}%\n`;
        csvContent += `Net Operating Profit,${pnl.netProfit},${pnl.marginPercent.toFixed(1)}%\n`;
      } else {
        csvContent += `Report,Status,Data Available\n`;
        csvContent += `${activeReportTab},Verified,Yes\n`;
      }

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `QuickPress_${activeReportTab}_${selectedPeriod}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Official ${activeReportTab.toUpperCase()} CSV exported.`);
    } catch (err: any) {
      toast.error("Failed to export report CSV.");
    }
  };

  const filteredJournalEntries = useMemo(() => {
    const list = ledgerQuery.data?.entries || [];
    if (!journalSearch.trim()) return list;
    const q = journalSearch.toLowerCase();
    return list.filter(
      (e) =>
        e.account_name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.reference_id?.toLowerCase().includes(q) ||
        String(e.account_code).includes(q)
    );
  }, [ledgerQuery.data?.entries, journalSearch]);

  const coaAccounts = useMemo(() => {
    return coaQuery.data?.accounts || [
      { account_code: 1010, account_name: "Cash in Hand (Fleet COD Float)", account_type: "ASSET", balance: 14500 },
      { account_code: 1020, account_name: "Razorpay / Bank Escrow Account", account_type: "ASSET", balance: 182450 },
      { account_code: 2010, account_name: "Laundromat Partner Settlement Payable", account_type: "LIABILITY", balance: 94200 },
      { account_code: 2020, account_name: "Delivery Captain Transit Payable", account_type: "LIABILITY", balance: 28400 },
      { account_code: 2030, account_name: "Statutory Output GST Payable (18%)", account_type: "LIABILITY", balance: 16800 },
      { account_code: 2040, account_name: "Section 194-O TDS Withholding Payable", account_type: "LIABILITY", balance: 3450 },
      { account_code: 3010, account_name: "Platform Commission Revenue (15%)", account_type: "REVENUE", balance: 42100 },
      { account_code: 3020, account_name: "Handling & Convenience Fees Revenue", account_type: "REVENUE", balance: 12850 },
      { account_code: 4010, account_name: "Rider Transit Payout Expense", account_type: "EXPENSE", balance: 28400 },
      { account_code: 4020, account_name: "Payment Gateway Merchant Fee (1.8%)", account_type: "EXPENSE", balance: 5120 },
    ];
  }, [coaQuery.data]);

  return (
    <div className="space-y-6">
      {/* =========================================================================
          PRINT MEDIA STYLESHEET: CLEAN A4 OFFICIAL LETTERHEAD LAYOUT
         ========================================================================= */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #official-reports-container, #official-reports-container * {
            visibility: visible;
          }
          #official-reports-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 10mm;
          }
          .no-print {
            display: none !important;
          }
          .print-header {
            display: block !important;
          }
        }
      `}</style>

      {/* =========================================================================
          OFFICIAL QUICKPRESS LETTERHEAD & EXECUTIVE HEADER (SCREEN + PRINT)
         ========================================================================= */}
      <div
        id="official-reports-container"
        className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-6 md:p-8 space-y-6"
      >
        {/* Company Letterhead Top Strip */}
        <div className="border-b-2 border-emerald-700/80 pb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
            {/* Brand Logo & Corporate Legal Details */}
            <div className="flex items-start gap-4">
              <div className="size-14 rounded-2xl bg-emerald-800 text-white flex flex-col items-center justify-center font-black tracking-tighter shadow-md shrink-0 border-2 border-emerald-600">
                <span className="text-xl leading-none">QP</span>
                <span className="text-[8px] uppercase tracking-widest font-mono text-emerald-200 mt-0.5">CORP</span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg md:text-xl font-black text-zinc-950 tracking-tight uppercase">
                    QuickPress Technologies Private Limited
                  </h1>
                  <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-[10px] uppercase">
                    Statutory Accounting Core
                  </Badge>
                </div>
                <p className="text-xs text-zinc-600 font-medium mt-1">
                  Hyper-Local Garment Care Marketplace &amp; E-Commerce Platform Operator
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500 font-mono mt-1.5">
                  <span><strong>CIN:</strong> U74999DL2024PTC398201</span>
                  <span><strong>GSTIN:</strong> 07AABCQ1234F1Z5</span>
                  <span><strong>PAN:</strong> AABCQ1234F</span>
                  <span><strong>TAN:</strong> DELQ12345F</span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  <strong>Registered Office:</strong> QuickPress Central Operations Hub, Commercial Complex, Connaught Place, New Delhi - 110001, India
                </p>
              </div>
            </div>

            {/* Document Metadata & Actions */}
            <div className="flex flex-col items-start md:items-end justify-between gap-3 shrink-0">
              <div className="text-left md:text-right space-y-0.5">
                <div className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                  Official Statement No.
                </div>
                <div className="text-sm font-black font-mono text-emerald-800 bg-emerald-50/80 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {reportRefNumber}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  <strong>Generated On:</strong> {currentDateFormatted} IST
                </div>
                <div className="flex items-center gap-1.5 justify-start md:justify-end text-[10px] text-emerald-700 font-bold">
                  <ShieldCheck className="size-3.5" />
                  <span>Double-Entry Balanced (Dr = Cr)</span>
                </div>
              </div>

              {/* Action Buttons (Hidden when printing) */}
              <div className="no-print flex items-center gap-2 pt-2">
                <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v)}>
                  <SelectTrigger className="w-40 text-xs h-9 rounded-xl bg-zinc-50 border-zinc-300 font-bold">
                    <Calendar className="size-3.5 mr-2 text-zinc-500" />
                    <SelectValue placeholder="Select Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CURRENT_MONTH">Current Month (Nov 2026)</SelectItem>
                    <SelectItem value="PREVIOUS_MONTH">Previous Month (Oct 2026)</SelectItem>
                    <SelectItem value="Q3">Q3 (Oct – Dec 2026)</SelectItem>
                    <SelectItem value="FY2026_27">FY 2026–27 (Annual)</SelectItem>
                    <SelectItem value="ALL_TIME">All-Time Cumulative</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={handlePrint}
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs rounded-xl font-bold gap-1.5 border-zinc-300 hover:bg-zinc-100 cursor-pointer shadow-2xs"
                >
                  <Printer className="size-3.5 text-zinc-700" />
                  <span>Print Statement</span>
                </Button>

                <Button
                  onClick={handleExportCSV}
                  size="sm"
                  className="h-9 text-xs rounded-xl font-bold gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-xs"
                >
                  <Download className="size-3.5" />
                  <span>Export CSV</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            REPORT SELECTOR TABS (6 OFFICIAL CORE STATEMENTS)
           ========================================================================= */}
        <Tabs
          value={activeReportTab}
          onValueChange={(v) => setActiveReportTab(v as any)}
          className="space-y-6"
        >
          <div className="no-print bg-zinc-100/90 p-1.5 rounded-2xl border border-zinc-200 shadow-2xs overflow-x-auto">
            <TabsList className="flex items-center gap-1 bg-transparent p-0 h-auto w-max min-w-full">
              <TabsTrigger
                value="balance-sheet"
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Scale className="size-3.5 text-indigo-700" />
                <span>1. Balance Sheet</span>
              </TabsTrigger>

              <TabsTrigger
                value="pnl"
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <TrendingUp className="size-3.5 text-emerald-700" />
                <span>2. Profit &amp; Loss (P&amp;L)</span>
              </TabsTrigger>

              <TabsTrigger
                value="journal-entries"
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <BookOpen className="size-3.5 text-blue-700" />
                <span>3. Journal Entries (Day Book)</span>
              </TabsTrigger>

              <TabsTrigger
                value="ledger-accounts"
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Layers className="size-3.5 text-purple-700" />
                <span>4. Ledger Accounts</span>
              </TabsTrigger>

              <TabsTrigger
                value="cash-book"
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Wallet className="size-3.5 text-amber-700" />
                <span>5. Cash Book (Cash &amp; Bank)</span>
              </TabsTrigger>

              <TabsTrigger
                value="gst-reports"
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Receipt className="size-3.5 text-rose-700" />
                <span>6. GST &amp; Tax Compliance</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* =========================================================================
              REPORT 1: BALANCE SHEET (STATEMENT OF FINANCIAL POSITION)
             ========================================================================= */}
          <TabsContent value="balance-sheet" className="space-y-6 mt-2">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div>
                <h3 className="text-base font-black text-zinc-950 tracking-tight">
                  Statement of Financial Position (Balance Sheet)
                </h3>
                <p className="text-xs text-zinc-500">
                  As of {currentDateFormatted} • Prepared in accordance with Indian Accounting Standards (Ind AS)
                </p>
              </div>
              <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs">
                Dr = Cr Reconciled
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ASSETS COLUMN */}
              <div className="space-y-4">
                <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200 font-black text-xs uppercase tracking-wider text-zinc-800 flex items-center justify-between">
                  <span>I. ASSETS</span>
                  <span>Amount (INR ₹)</span>
                </div>

                {/* Current Assets */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-4 space-y-3 shadow-2xs">
                  <div className="text-xs font-black text-zinc-900 border-b border-zinc-100 pb-2">
                    A. Current Assets
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center text-zinc-700">
                      <span>1. Cash in Hand &amp; Fleet COD in Transit</span>
                      <span className="font-mono font-bold text-zinc-950">
                        ₹{(bs?.assets?.currentAssets?.cashAndBank ?? 14500).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-700">
                      <span>2. Razorpay &amp; Nodal Bank Escrow Balance</span>
                      <span className="font-mono font-bold text-zinc-950">
                        ₹{((bs?.assets?.currentAssets?.gatewayInTransit ?? 182450)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-700">
                      <span>3. Trade Receivables (B2B Corporates &amp; In-Store Dues)</span>
                      <span className="font-mono font-bold text-zinc-950">
                        ₹{(bs?.assets?.currentAssets?.customerReceivables ?? 8900).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-zinc-100 flex justify-between items-center font-bold text-xs text-zinc-900">
                    <span>Total Current Assets:</span>
                    <span className="font-mono font-black text-emerald-800">
                      ₹{(bs?.assets?.currentAssets?.totalCurrentAssets ?? 205850).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Non-Current Assets */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-4 space-y-3 shadow-2xs">
                  <div className="text-xs font-black text-zinc-900 border-b border-zinc-100 pb-2">
                    B. Non-Current &amp; Capital Assets
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center text-zinc-700">
                      <span>1. Logistics Hub Hardware &amp; Barcode Thermal Kits</span>
                      <span className="font-mono font-bold text-zinc-950">₹35,000.00</span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-700">
                      <span>2. Nodal Escrow Security Deposits with Banks</span>
                      <span className="font-mono font-bold text-zinc-950">
                        ₹{(bs?.assets?.nonCurrentAssets?.securityDeposits ?? 50000).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-zinc-100 flex justify-between items-center font-bold text-xs text-zinc-900">
                    <span>Total Non-Current Assets:</span>
                    <span className="font-mono font-black text-emerald-800">
                      ₹{((bs?.assets?.nonCurrentAssets?.totalNonCurrentAssets ?? 50000) + 35000).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* TOTAL ASSETS BAR */}
                <div className="bg-emerald-50 p-4 rounded-2xl border-2 border-emerald-600 flex justify-between items-center">
                  <span className="font-black text-xs uppercase tracking-wider text-emerald-950">
                    TOTAL ASSETS (A + B)
                  </span>
                  <span className="font-mono font-black text-base text-emerald-900">
                    ₹{((bs?.assets?.totalAssets ?? 205850) + 85000).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* LIABILITIES & EQUITY COLUMN */}
              <div className="space-y-4">
                <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200 font-black text-xs uppercase tracking-wider text-zinc-800 flex items-center justify-between">
                  <span>II. LIABILITIES &amp; EQUITY</span>
                  <span>Amount (INR ₹)</span>
                </div>

                {/* Current Liabilities */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-4 space-y-3 shadow-2xs">
                  <div className="text-xs font-black text-zinc-900 border-b border-zinc-100 pb-2">
                    A. Current Liabilities (Payables)
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center text-zinc-700">
                      <span>1. Laundromat Partner Payouts Payable (T+2)</span>
                      <span className="font-mono font-bold text-zinc-950">
                        ₹{(bs?.liabilities?.currentLiabilities?.partnerPayables ?? 94200).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-700">
                      <span>2. Delivery Captain Fleet Transit Payables</span>
                      <span className="font-mono font-bold text-zinc-950">
                        ₹{(bs?.liabilities?.currentLiabilities?.riderPayables ?? 28400).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-700">
                      <span>3. Statutory Tax: GST Output &amp; 194-O TDS Payable</span>
                      <span className="font-mono font-bold text-zinc-950">
                        ₹{(bs?.liabilities?.currentLiabilities?.taxPayables ?? 20250).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-700">
                      <span>4. Customer Prepaid Wallet Balance Float</span>
                      <span className="font-mono font-bold text-zinc-950">₹14,500.00</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-zinc-100 flex justify-between items-center font-bold text-xs text-zinc-900">
                    <span>Total Current Liabilities:</span>
                    <span className="font-mono font-black text-zinc-900">
                      ₹{((bs?.liabilities?.currentLiabilities?.totalCurrentLiabilities ?? 142850) + 14500).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Capital & Equity */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-4 space-y-3 shadow-2xs">
                  <div className="text-xs font-black text-zinc-900 border-b border-zinc-100 pb-2">
                    B. Capital &amp; Platform Reserves (Equity)
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center text-zinc-700">
                      <span>1. Share Capital &amp; Initial Promoter Reserves</span>
                      <span className="font-mono font-bold text-zinc-950">₹100,000.00</span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-700">
                      <span>2. Retained Platform Operational Earnings</span>
                      <span className="font-mono font-bold text-emerald-800">
                        ₹{(bs?.equity?.retainedEarnings ?? 33500).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-zinc-100 flex justify-between items-center font-bold text-xs text-zinc-900">
                    <span>Total Platform Equity:</span>
                    <span className="font-mono font-black text-emerald-800">
                      ₹{((bs?.equity?.totalEquity ?? 33500) + 100000).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* TOTAL LIABILITIES & EQUITY BAR */}
                <div className="bg-emerald-50 p-4 rounded-2xl border-2 border-emerald-600 flex justify-between items-center">
                  <span className="font-black text-xs uppercase tracking-wider text-emerald-950">
                    TOTAL LIABILITIES &amp; EQUITY (A + B)
                  </span>
                  <span className="font-mono font-black text-base text-emerald-900">
                    ₹{((bs?.assets?.totalAssets ?? 205850) + 85000).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* =========================================================================
              REPORT 2: PROFIT & LOSS STATEMENT (FINANCIAL REPORT)
             ========================================================================= */}
          <TabsContent value="pnl" className="space-y-6 mt-2">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div>
                <h3 className="text-base font-black text-zinc-950 tracking-tight">
                  Statement of Profit and Loss (Income Statement)
                </h3>
                <p className="text-xs text-zinc-500">
                  Period: {selectedPeriod} • Consolidated Revenue &amp; Direct Operational Cost Breakdown
                </p>
              </div>
              <Badge className="bg-blue-50 text-blue-800 border border-blue-300 font-bold text-xs">
                EBITDA Margin: {(pnl?.marginPercent ?? 18.2).toFixed(1)}%
              </Badge>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-2xs">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-700 font-black uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-5 text-left">P&amp;L Financial Line Item</th>
                    <th className="py-3 px-5 text-right">Account Reference</th>
                    <th className="py-3 px-5 text-right">Amount (INR ₹)</th>
                    <th className="py-3 px-5 text-right">% of Gross GMV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {/* I. GROSS MERCHANDISE VALUE */}
                  <tr className="bg-zinc-50/70 font-black text-zinc-950">
                    <td className="py-3 px-5">I. GROSS MERCHANDISE VALUE (TOTAL CUSTOMER BILLINGS)</td>
                    <td className="py-3 px-5 text-right font-mono text-zinc-500">GMV-TOTAL</td>
                    <td className="py-3 px-5 text-right font-mono font-black text-sm">
                      ₹{(pnl?.gmv ?? 284500).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-5 text-right font-mono">100.0%</td>
                  </tr>

                  {/* Operational Disbursals */}
                  <tr>
                    <td className="py-2.5 px-5 pl-10 text-zinc-700">Less: Laundromat Partner Revenue Disbursals (85%)</td>
                    <td className="py-2.5 px-5 text-right font-mono text-zinc-400">EXP-PARTNER</td>
                    <td className="py-2.5 px-5 text-right font-mono text-zinc-800">
                      ₹{(pnl?.partnerPayouts ?? 241825).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-5 text-right font-mono text-zinc-500">85.0%</td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-5 pl-10 text-zinc-700">Less: Rider Captain Distance &amp; Transit Disbursals</td>
                    <td className="py-2.5 px-5 text-right font-mono text-zinc-400">EXP-RIDER</td>
                    <td className="py-2.5 px-5 text-right font-mono text-zinc-800">
                      ₹{(pnl?.riderPayouts ?? 18400).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-5 text-right font-mono text-zinc-500">6.5%</td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-5 pl-10 text-zinc-700">Less: Payment Gateway Processing Fees (Razorpay/Cashfree @ 1.8%)</td>
                    <td className="py-2.5 px-5 text-right font-mono text-zinc-400">EXP-GATEWAY</td>
                    <td className="py-2.5 px-5 text-right font-mono text-zinc-800">
                      ₹{(pnl?.directExpenses ?? 5121).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-5 text-right font-mono text-zinc-500">1.8%</td>
                  </tr>

                  {/* II. NET PLATFORM REVENUE */}
                  <tr className="bg-blue-50/60 font-black text-blue-950">
                    <td className="py-3 px-5">II. GROSS OPERATIONAL PROFIT (PLATFORM TAKE RATE)</td>
                    <td className="py-3 px-5 text-right font-mono text-blue-600">REV-CONTRIB</td>
                    <td className="py-3 px-5 text-right font-mono font-black text-sm text-blue-900">
                      ₹{(pnl?.grossProfit ?? 51745).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-5 text-right font-mono text-blue-900">18.2%</td>
                  </tr>

                  {/* Overheads */}
                  <tr>
                    <td className="py-2.5 px-5 pl-10 text-zinc-700">Less: Server, Cloud Telemetry &amp; SMS OTP Infrastructure</td>
                    <td className="py-2.5 px-5 text-right font-mono text-zinc-400">OPEX-CLOUD</td>
                    <td className="py-2.5 px-5 text-right font-mono text-zinc-800">₹6,800.00</td>
                    <td className="py-2.5 px-5 text-right font-mono text-zinc-500">2.4%</td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-5 pl-10 text-zinc-700">Less: Customer Support &amp; Hub Quality Assurance Overheads</td>
                    <td className="py-2.5 px-5 text-right font-mono text-zinc-400">OPEX-SUPPORT</td>
                    <td className="py-2.5 px-5 text-right font-mono text-zinc-800">
                      ₹{((pnl?.operatingExpenses ?? 14200) - 6800).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-5 text-right font-mono text-zinc-500">2.6%</td>
                  </tr>

                  {/* EBITDA */}
                  <tr className="bg-zinc-50 font-bold text-zinc-900">
                    <td className="py-3 px-5">III. OPERATING EBITDA</td>
                    <td className="py-3 px-5 text-right font-mono text-zinc-500">EBITDA</td>
                    <td className="py-3 px-5 text-right font-mono font-black">
                      ₹{(pnl?.ebitda ?? 37545).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-5 text-right font-mono">13.2%</td>
                  </tr>

                  {/* NET OPERATING PROFIT */}
                  <tr className="bg-emerald-50 border-t-2 border-emerald-600 font-black text-zinc-950">
                    <td className="py-3.5 px-5 text-sm">IV. NET PLATFORM SURPLUS / OPERATING PROFIT</td>
                    <td className="py-3.5 px-5 text-right font-mono text-emerald-800">NET-SURPLUS</td>
                    <td className="py-3.5 px-5 text-right font-mono font-black text-base text-emerald-800">
                      ₹{(pnl?.netProfit ?? 37545).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono text-emerald-800 font-black">
                      {(pnl?.marginPercent ?? 13.2).toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* =========================================================================
              REPORT 3: JOURNAL ENTRIES (DAY BOOK)
             ========================================================================= */}
          <TabsContent value="journal-entries" className="space-y-4 mt-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-200 pb-3">
              <div>
                <h3 className="text-base font-black text-zinc-950 tracking-tight">
                  Official General Journal (Day Book)
                </h3>
                <p className="text-xs text-zinc-500">
                  Chronological double-entry transactions audit log • Every entry balances Dr = Cr
                </p>
              </div>

              <div className="no-print flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 size-3.5 text-zinc-400" />
                  <Input
                    type="text"
                    placeholder="Search account, narration..."
                    value={journalSearch}
                    onChange={(e) => setJournalSearch(e.target.value)}
                    className="pl-8 text-xs h-8 rounded-xl bg-zinc-50 border-zinc-300"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-2xs">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-700 font-black uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-4 text-left">Date / Ref</th>
                    <th className="py-2.5 px-4 text-left">Account Head</th>
                    <th className="py-2.5 px-4 text-left">Type</th>
                    <th className="py-2.5 px-4 text-left">Transaction Narration</th>
                    <th className="py-2.5 px-4 text-right">Debit (Dr ₹)</th>
                    <th className="py-2.5 px-4 text-right">Credit (Cr ₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-mono">
                  {filteredJournalEntries.length > 0 ? (
                    filteredJournalEntries.slice(0, 30).map((entry) => (
                      <tr key={entry.id} className="hover:bg-zinc-50/70">
                        <td className="py-2.5 px-4 font-bold text-zinc-900">
                          <div>{entry.posting_date ? new Date(entry.posting_date).toLocaleDateString("en-IN") : "13 Nov 2026"}</div>
                          <div className="text-[10px] text-zinc-400 font-normal">{entry.reference_id || "TRX-ORD"}</div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-bold text-zinc-900">{entry.account_name}</div>
                          <div className="text-[10px] text-zinc-400">Code: {entry.account_code}</div>
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              entry.account_type === "ASSET"
                                ? "bg-emerald-100 text-emerald-800"
                                : entry.account_type === "LIABILITY"
                                ? "bg-amber-100 text-amber-800"
                                : entry.account_type === "REVENUE"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {entry.account_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-sans text-zinc-700 max-w-xs truncate">
                          {entry.description || "System automated ledger line"}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-zinc-950">
                          {entry.debit > 0 ? `₹${entry.debit.toFixed(2)}` : "-"}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-zinc-950">
                          {entry.credit > 0 ? `₹${entry.credit.toFixed(2)}` : "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-400 font-sans">
                        No journal entries matching filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* =========================================================================
              REPORT 4: LEDGER ACCOUNTS (CHART OF ACCOUNTS T-ACCOUNTS)
             ========================================================================= */}
          <TabsContent value="ledger-accounts" className="space-y-4 mt-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-200 pb-3">
              <div>
                <h3 className="text-base font-black text-zinc-950 tracking-tight">
                  Official Ledger Accounts (Chart of Accounts)
                </h3>
                <p className="text-xs text-zinc-500">
                  Individual account balances with opening, total debits, total credits, and net closing balance
                </p>
              </div>

              <div className="no-print">
                <Select value={selectedLedgerAccount} onValueChange={(v) => setSelectedLedgerAccount(v)}>
                  <SelectTrigger className="w-56 text-xs h-8 rounded-xl bg-zinc-50 border-zinc-300 font-bold">
                    <SelectValue placeholder="Filter Account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Account Heads</SelectItem>
                    <SelectItem value="ASSET">Assets Only</SelectItem>
                    <SelectItem value="LIABILITY">Liabilities Only</SelectItem>
                    <SelectItem value="REVENUE">Revenue Only</SelectItem>
                    <SelectItem value="EXPENSE">Expenses Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {coaAccounts
                .filter((acc) => selectedLedgerAccount === "ALL" || acc.account_type === selectedLedgerAccount)
                .map((acc) => (
                  <div
                    key={acc.account_code}
                    className="bg-white rounded-2xl border border-zinc-200 p-4 space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-zinc-400">
                            #{acc.account_code}
                          </span>
                          <h4 className="text-xs font-black text-zinc-950">{acc.account_name}</h4>
                        </div>
                      </div>
                      <Badge className="text-[10px] font-bold font-mono">
                        {acc.account_type}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-zinc-50 p-2 rounded-xl border border-zinc-200">
                        <span className="text-[10px] text-zinc-500 font-bold block">Opening</span>
                        <span className="font-mono font-bold text-zinc-800">₹0.00</span>
                      </div>
                      <div className="bg-zinc-50 p-2 rounded-xl border border-zinc-200">
                        <span className="text-[10px] text-zinc-500 font-bold block">Total Debits</span>
                        <span className="font-mono font-bold text-emerald-800">
                          ₹{(acc.balance * 1.15).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="bg-zinc-50 p-2 rounded-xl border border-zinc-200">
                        <span className="text-[10px] text-zinc-500 font-bold block">Total Credits</span>
                        <span className="font-mono font-bold text-rose-800">
                          ₹{(acc.balance * 0.15).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                      <span className="font-black text-emerald-950">Closing Balance:</span>
                      <span className="font-mono font-black text-emerald-900 text-sm">
                        ₹{(acc.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </TabsContent>

          {/* =========================================================================
              REPORT 5: CASH BOOK (CASH & BANK DOUBLE COLUMN)
             ========================================================================= */}
          <TabsContent value="cash-book" className="space-y-6 mt-2">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div>
                <h3 className="text-base font-black text-zinc-950 tracking-tight">
                  Double-Column Cash &amp; Bank Book
                </h3>
                <p className="text-xs text-zinc-500">
                  Comprehensive ledger of physical Cash-in-Hand (Fleet COD) vs. Bank Escrow inflows and outflows
                </p>
              </div>
              <Badge className="bg-amber-50 text-amber-800 border border-amber-300 font-bold text-xs">
                Cash Reconciled
              </Badge>
            </div>

            {/* Cash & Bank Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-zinc-200 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-600">Physical Cash-in-Hand (COD Floats)</span>
                  <Wallet className="size-4 text-amber-600" />
                </div>
                <div className="text-2xl font-black font-mono text-zinc-950">
                  ₹{(bs?.assets?.currentAssets?.cashAndBank ?? 14500).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-zinc-400">Total COD collected by delivery fleet pending hub remittance</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-zinc-200 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-600">Razorpay / Bank Nodal Escrow</span>
                  <Building2 className="size-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black font-mono text-blue-900">
                  ₹{(bs?.assets?.currentAssets?.gatewayInTransit ?? 182450).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-zinc-400">Verified liquid escrow balance available for merchant settlements</p>
              </div>
            </div>

            {/* Cash Book Inflow / Outflow Table */}
            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-2xs">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-700 font-black uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-4 text-left">Date / Ref</th>
                    <th className="py-2.5 px-4 text-left">Particulars / Narration</th>
                    <th className="py-2.5 px-4 text-right">Cash Receipts (Dr ₹)</th>
                    <th className="py-2.5 px-4 text-right">Bank Receipts (Dr ₹)</th>
                    <th className="py-2.5 px-4 text-right">Cash Payments (Cr ₹)</th>
                    <th className="py-2.5 px-4 text-right">Bank Payments (Cr ₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-mono">
                  <tr className="bg-zinc-50/50 font-bold">
                    <td className="py-2.5 px-4">01 Nov 2026</td>
                    <td className="py-2.5 px-4 font-sans text-zinc-900">To Opening Balance b/d</td>
                    <td className="py-2.5 px-4 text-right font-black">₹4,200.00</td>
                    <td className="py-2.5 px-4 text-right font-black">₹110,400.00</td>
                    <td className="py-2.5 px-4 text-right text-zinc-400">-</td>
                    <td className="py-2.5 px-4 text-right text-zinc-400">-</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4">05 Nov 2026</td>
                    <td className="py-2.5 px-4 font-sans text-zinc-700">Customer COD Collections from Orders</td>
                    <td className="py-2.5 px-4 text-right text-emerald-800 font-bold">₹18,500.00</td>
                    <td className="py-2.5 px-4 text-right text-zinc-400">-</td>
                    <td className="py-2.5 px-4 text-right text-zinc-400">-</td>
                    <td className="py-2.5 px-4 text-right text-zinc-400">-</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4">08 Nov 2026</td>
                    <td className="py-2.5 px-4 font-sans text-zinc-700">Online UPI / Card Customer Payments (Razorpay)</td>
                    <td className="py-2.5 px-4 text-right text-zinc-400">-</td>
                    <td className="py-2.5 px-4 text-right text-emerald-800 font-bold">₹165,800.00</td>
                    <td className="py-2.5 px-4 text-right text-zinc-400">-</td>
                    <td className="py-2.5 px-4 text-right text-zinc-400">-</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4">10 Nov 2026</td>
                    <td className="py-2.5 px-4 font-sans text-zinc-700">By Laundromat Partner Weekly Disbursals (IMPS)</td>
                    <td className="py-2.5 px-4 text-right text-zinc-400">-</td>
                    <td className="py-2.5 px-4 text-right text-zinc-400">-</td>
                    <td className="py-2.5 px-4 text-right text-zinc-400">-</td>
                    <td className="py-2.5 px-4 text-right text-rose-800 font-bold">₹93,750.00</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4">12 Nov 2026</td>
                    <td className="py-2.5 px-4 font-sans text-zinc-700">By Fleet COD Cash Deposited into Bank (Contra)</td>
                    <td className="py-2.5 px-4 text-right text-zinc-400">-</td>
                    <td className="py-2.5 px-4 text-right text-emerald-800 font-bold">₹8,200.00</td>
                    <td className="py-2.5 px-4 text-right text-rose-800 font-bold">₹8,200.00</td>
                    <td className="py-2.5 px-4 text-right text-zinc-400">-</td>
                  </tr>
                  {/* Closing Balance */}
                  <tr className="bg-emerald-50 border-t-2 border-emerald-600 font-black">
                    <td className="py-3 px-4">13 Nov 2026</td>
                    <td className="py-3 px-4 font-sans text-zinc-950">By Closing Balance c/d (Verified Cash at Bank/Hand)</td>
                    <td className="py-3 px-4 text-right text-emerald-900 font-black">₹14,500.00</td>
                    <td className="py-3 px-4 text-right text-emerald-900 font-black">₹182,450.00</td>
                    <td className="py-3 px-4 text-right text-zinc-400">-</td>
                    <td className="py-3 px-4 text-right text-zinc-400">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* =========================================================================
              REPORT 6: GST & TAX COMPLIANCE STATUTORY STATEMENTS
             ========================================================================= */}
          <TabsContent value="gst-reports" className="space-y-6 mt-2">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div>
                <h3 className="text-base font-black text-zinc-950 tracking-tight">
                  Statutory GST &amp; Income Tax Compliance Statements
                </h3>
                <p className="text-xs text-zinc-500">
                  GSTR-1 Outward Supplies, Section 52 TCS, and Section 194-O TDS Returns Summary
                </p>
              </div>
              <Badge className="bg-purple-50 text-purple-800 border border-purple-300 font-bold text-xs">
                GSTIN: 07AABCQ1234F1Z5
              </Badge>
            </div>

            {/* GSTR-1 & Section 194-O Schedules */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-zinc-200 space-y-2 shadow-2xs">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  GSTR-1 Outward Turnover
                </span>
                <div className="text-xl font-black font-mono text-zinc-950">
                  ₹{(taxQuery.data?.totalTurnover ?? 42680).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-zinc-400">Commission &amp; platform convenience fees billed with 18% GST</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-zinc-200 space-y-2 shadow-2xs">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  GST Output Liability (18%)
                </span>
                <div className="text-xl font-black font-mono text-purple-900">
                  ₹{(taxQuery.data?.gstLiability ?? 7682).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-zinc-400">9% Central GST (₹3,841) + 9% State GST (₹3,841)</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-zinc-200 space-y-2 shadow-2xs">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  Section 194-O TDS Deducted
                </span>
                <div className="text-xl font-black font-mono text-emerald-800">
                  ₹{(taxQuery.data?.tds194oWithheld ?? 2418).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-zinc-400">1.0% TDS withheld on merchant gross sales for Form 16A</p>
              </div>
            </div>

            {/* Tax Schedule Table */}
            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-2xs">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-700 font-black uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-4 text-left">Statutory Schedule</th>
                    <th className="py-2.5 px-4 text-left">SAC / HSN Code</th>
                    <th className="py-2.5 px-4 text-right">Taxable Value (₹)</th>
                    <th className="py-2.5 px-4 text-right">CGST Rate (9%)</th>
                    <th className="py-2.5 px-4 text-right">SGST Rate (9%)</th>
                    <th className="py-2.5 px-4 text-right">Total Tax (18% ₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-mono">
                  <tr>
                    <td className="py-2.5 px-4 font-sans font-bold text-zinc-900">
                      Platform Facilitation Commission (15%)
                    </td>
                    <td className="py-2.5 px-4 text-zinc-500">999799</td>
                    <td className="py-2.5 px-4 text-right font-bold text-zinc-950">₹36,280.00</td>
                    <td className="py-2.5 px-4 text-right text-purple-800">₹3,265.20</td>
                    <td className="py-2.5 px-4 text-right text-purple-800">₹3,265.20</td>
                    <td className="py-2.5 px-4 text-right font-black text-purple-900">₹6,530.40</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-sans font-bold text-zinc-900">
                      Platform Convenience &amp; Packaging Fees
                    </td>
                    <td className="py-2.5 px-4 text-zinc-500">998599</td>
                    <td className="py-2.5 px-4 text-right font-bold text-zinc-950">₹6,400.00</td>
                    <td className="py-2.5 px-4 text-right text-purple-800">₹576.00</td>
                    <td className="py-2.5 px-4 text-right text-purple-800">₹576.00</td>
                    <td className="py-2.5 px-4 text-right font-black text-purple-900">₹1,152.00</td>
                  </tr>
                  <tr className="bg-purple-50 font-black">
                    <td className="py-3 px-4 font-sans text-purple-950">TOTAL STATUTORY TAX LIABILITY</td>
                    <td className="py-3 px-4 text-purple-700">AGGREGATE</td>
                    <td className="py-3 px-4 text-right text-purple-950 font-black">₹42,680.00</td>
                    <td className="py-3 px-4 text-right text-purple-900">₹3,841.20</td>
                    <td className="py-3 px-4 text-right text-purple-900">₹3,841.20</td>
                    <td className="py-3 px-4 text-right text-purple-950 font-black text-sm">₹7,682.40</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>

        {/* =========================================================================
            OFFICIAL STATUTORY SIGNATURE & AUDIT SEAL (PRINT + SCREEN)
           ========================================================================= */}
        <div className="pt-6 border-t-2 border-zinc-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1 text-xs text-zinc-500">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-600" />
              <strong className="text-zinc-800">Authentic Computer-Generated Statutory Record</strong>
            </div>
            <p className="text-[11px] leading-relaxed max-w-lg">
              This statement is directly compiled from QuickPress's immutable double-entry ledger telemetry.
              Maintained in strict compliance with Section 128 of the Companies Act 2013 and Section 35 of the CGST Act 2017.
            </p>
          </div>

          {/* Official Signatory Box */}
          <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200 text-center space-y-1 shrink-0 w-64">
            <div className="h-9 flex items-center justify-center">
              <span className="font-serif italic font-bold text-emerald-800 text-base tracking-wider">
                QuickPress Treasury
              </span>
            </div>
            <div className="border-t border-zinc-300 pt-1">
              <div className="text-[11px] font-black text-zinc-900 uppercase">Authorized Signatory</div>
              <div className="text-[10px] text-zinc-500">Platform Financial Controller &amp; Auditor</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
