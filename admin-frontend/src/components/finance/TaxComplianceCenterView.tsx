import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import { fetchTaxCenter, TaxCenterResponse } from "@/api/finance-api";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";

type ActiveTaxTab = "gstr3b" | "gstr8" | "invoices_3way" | "b2b_invoices" | "calendar";

export function TaxComplianceCenterView() {
  const [activeTab, setActiveTab] = useState<ActiveTaxTab>("gstr3b");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<TaxCenterResponse>({
    queryKey: ["tax-center"],
    queryFn: () => fetchTaxCenter(),
    staleTime: 30000,
  });

  const summary = data?.taxSummary;
  const calendar = data?.complianceCalendar || [];
  const gstr3b = data?.gstr3bLedger || [];
  const gstr8 = data?.gstr8TcsLedger || [];
  const b2bInvoices = data?.b2bInvoicesLedger || [];
  const threeWayInvoices = data?.threeWayInvoicesSample || [];

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Filtered 3-Way Invoices
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

  // Filtered GSTR-8 Partners
  const filteredGstr8 = useMemo(() => {
    if (!searchQuery.trim()) return gstr8;
    const q = searchQuery.toLowerCase();
    return gstr8.filter(
      (p) =>
        p.businessName.toLowerCase().includes(q) ||
        p.gstin.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q)
    );
  }, [gstr8, searchQuery]);

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
            Deterministic real-data tax ledger, monthly GSTR-3B liability, GSTR-8 TCS, Section 194-O TDS, and Rapido-style 3-Way Invoicing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3 py-1.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-mono text-zinc-700 flex items-center gap-1.5">
            <span className="text-zinc-400 font-sans text-[11px]">GSTIN:</span>
            <span className="font-bold text-zinc-950">{data?.gstin || "09AAECQ1234F1Z5"}</span>
            <button
              type="button"
              onClick={() => copyToClipboard(data?.gstin || "09AAECQ1234F1Z5", "gstin")}
              className="text-zinc-400 hover:text-zinc-800 ml-1"
              title="Copy GSTIN"
            >
              {copiedKey === "gstin" ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
            </button>
          </div>

          <div className="px-3 py-1.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-mono text-zinc-700">
            <span className="text-zinc-400 font-sans text-[11px]">PAN:</span>{" "}
            <span className="font-bold text-zinc-950">{data?.pan || "AAECQ1234F"}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-9 text-xs rounded-xl border-zinc-200"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
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
          {/* 2. STATUTORY EXECUTIVE KPIS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Gross Taxable Sales */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Gross Taxable Base</span>
              <div className="text-2xl font-black text-zinc-950 mt-1.5 tabular-nums">
                ₹{(summary?.grossTaxableSales ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1 flex flex-wrap gap-x-2">
                <span>Laundry: ₹{(summary?.laundryTaxableSales ?? 0).toFixed(0)}</span>
                <span>•</span>
                <span>Logistics: ₹{(summary?.deliveryTaxableSales ?? 0).toFixed(0)}</span>
                <span>•</span>
                <span>Platform: ₹{(summary?.platformTaxableSales ?? 0).toFixed(0)}</span>
              </div>
            </div>

            {/* KPI 2: Total GST Collected from Customers */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total GST Collected</span>
              <div className="text-2xl font-black text-emerald-700 mt-1.5 tabular-nums">
                ₹{(summary?.totalGstCollected ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1.5">
                <span>CGST: ₹{(summary?.cgstCollected ?? 0).toFixed(0)}</span>
                <span>•</span>
                <span>SGST: ₹{(summary?.sgstCollected ?? 0).toFixed(0)}</span>
                {summary?.igstCollected ? <span>• IGST: ₹{summary.igstCollected.toFixed(0)}</span> : null}
              </div>
            </div>

            {/* KPI 3: QuickPress Direct Section 9(5) Payable */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">QuickPress 9(5) Tax</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  Govt Direct
                </span>
              </div>
              <div className="text-2xl font-black text-blue-800 mt-1.5 tabular-nums">
                ₹{(summary?.gstSec95Payable ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">
                Unregistered Laundry + Delivery + Platform Fee
              </div>
            </div>

            {/* KPI 4: Net Statutory Remittance */}
            <div className="bg-white border border-emerald-300 rounded-2xl p-5 shadow-xs relative overflow-hidden bg-gradient-to-br from-emerald-50/40 via-white to-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Total Due to Govt</span>
                <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                  Due 20th Oct
                </Badge>
              </div>
              <div className="text-2xl font-black text-zinc-950 mt-1.5 tabular-nums">
                ₹{(summary?.netTaxPayable ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
                <span>TCS (Sec 52): ₹{(summary?.tcsSection52 ?? 0).toFixed(0)}</span>
                <span>•</span>
                <span>TDS (194-O): ₹{(summary?.tcs194O ?? 0).toFixed(0)}</span>
              </div>
            </div>
          </div>

          {/* 3. SECONDARY TAX METRICS (REGISTERED PARTNER SPLIT & SECTION 52) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-zinc-200/80 rounded-xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">GST Passed to Reg. Partners</span>
                <div className="text-lg font-black text-zinc-900 mt-0.5 tabular-nums">
                  ₹{(summary?.gstPassedToRegisteredPartners ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  {summary?.registeredPartnersCount ?? 0} Registered stores will file this directly
                </div>
              </div>
              <span className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                <Building2 className="size-5" />
              </span>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Section 52 TCS (1% on GSTR-8)</span>
                <div className="text-lg font-black text-zinc-900 mt-0.5 tabular-nums">
                  ₹{(summary?.tcsSection52 ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  Deducted & credited to Registered Partner GSTINs
                </div>
              </div>
              <span className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
                <ShieldCheck className="size-5" />
              </span>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Partner Tax Composition</span>
                <div className="text-lg font-black text-zinc-900 mt-0.5">
                  {summary?.registeredPartnersCount ?? 0} Registered · {summary?.unregisteredPartnersCount ?? 0} Unregistered
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  Automated bifurcated billing & payout engine
                </div>
              </div>
              <span className="p-2.5 bg-zinc-100 text-zinc-700 rounded-xl">
                <Scale className="size-5" />
              </span>
            </div>
          </div>

          {/* 4. TAB NAVIGATION & SEARCH CONTROLS */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-zinc-100 rounded-xl border border-zinc-200">
              <button
                type="button"
                onClick={() => setActiveTab("gstr3b")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === "gstr3b" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <FileSpreadsheet className="size-3.5 text-emerald-600" />
                GSTR-3B Summary
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("invoices_3way")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === "invoices_3way" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <Receipt className="size-3.5 text-blue-600" />
                3-Way Invoices Registry ({threeWayInvoices.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("gstr8")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === "gstr8" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <ShieldCheck className="size-3.5 text-purple-600" />
                GSTR-8 (1% TCS)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("b2b_invoices")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === "b2b_invoices" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <Building2 className="size-3.5 text-amber-600" />
                B2B Commission Invoices (ITC)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("calendar")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === "calendar" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <Calendar className="size-3.5 text-zinc-600" />
                Compliance Calendar
              </button>
            </div>

            {(activeTab === "invoices_3way" || activeTab === "gstr8") && (
              <div className="relative min-w-[240px]">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  placeholder="Search by ID, GSTIN, Store..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl bg-zinc-50 border-zinc-200"
                />
              </div>
            )}
          </div>

          {/* 5. TAB CONTENT PANELS */}

          {/* TAB 1: GSTR-3B SUMMARY LEDGER */}
          {activeTab === "gstr3b" && (
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-200 gap-2">
                <div>
                  <h3 className="text-sm font-black text-zinc-950 flex items-center gap-2">
                    <FileSpreadsheet className="size-4 text-emerald-600" />
                    GSTR-3B Outward Taxable Supplies Breakdown (SAC Wise)
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Monthly statutory return classification under CGST Section 9(5) and standard GST supply rules.
                  </p>
                </div>
                <Badge className="bg-zinc-100 text-zinc-800 border-zinc-200 self-start sm:self-auto font-mono text-[11px]">
                  State Code: 09 · UP
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="pb-3 text-left">SAC Code</th>
                      <th className="pb-3 text-left">Nature of Supply</th>
                      <th className="pb-3 text-right">Taxable Value</th>
                      <th className="pb-3 text-right">CGST (9%)</th>
                      <th className="pb-3 text-right">SGST (9%)</th>
                      <th className="pb-3 text-right">Total GST (18%)</th>
                      <th className="pb-3 text-right">Legal Remittance Authority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {gstr3b.map((row, i) => (
                      <tr key={i} className="hover:bg-zinc-50/70 transition-colors">
                        <td className="py-3.5 font-mono font-bold text-emerald-800">{row.sacCode}</td>
                        <td className="py-3.5 font-bold text-zinc-900">{row.natureOfSupply}</td>
                        <td className="py-3.5 text-right font-bold tabular-nums text-zinc-900">
                          ₹{row.taxableValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 text-right tabular-nums text-zinc-700">
                          ₹{row.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 text-right tabular-nums text-zinc-700">
                          ₹{row.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 text-right font-black tabular-nums text-emerald-700 text-sm">
                          ₹{row.totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 text-right">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
                            {row.remittedBy}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {/* Summary Totals Row */}
                    <tr className="bg-zinc-50/80 font-black border-t-2 border-zinc-200">
                      <td colSpan={2} className="py-3.5 px-2 text-zinc-900">Total Outward Supplies</td>
                      <td className="py-3.5 text-right tabular-nums text-zinc-950">
                        ₹{(summary?.grossTaxableSales ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 text-right tabular-nums text-zinc-900">
                        ₹{(summary?.cgstCollected ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 text-right tabular-nums text-zinc-900">
                        ₹{(summary?.sgstCollected ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 text-right tabular-nums text-emerald-800 text-sm">
                        ₹{(summary?.totalGstCollected ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 text-right text-emerald-700 text-[10px]">Ready for GSTR-3B Portal Upload</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: 3-WAY INVOICES REGISTRY (RAPIDO STYLE) */}
          {activeTab === "invoices_3way" && (
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-200 gap-2">
                <div>
                  <h3 className="text-sm font-black text-zinc-950 flex items-center gap-2">
                    <Receipt className="size-4 text-blue-600" />
                    3-Way Invoicing Registry (Partner + Rider + Platform)
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Rapido & Uber architecture: 3 distinct receipts per order ensuring zero tax ring-fencing disputes.
                  </p>
                </div>
                <span className="text-xs text-zinc-500 font-medium">
                  Showing {filteredThreeWayInvoices.length} Verified Orders
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="pb-3 text-left">Order & Date</th>
                      <th className="pb-3 text-left">🧺 Laundry Invoice (Partner)</th>
                      <th className="pb-3 text-left">🚴 Delivery Receipt (Rider)</th>
                      <th className="pb-3 text-left">⚙️ Platform Fee (QuickPress)</th>
                      <th className="pb-3 text-right">Order Grand Total</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredThreeWayInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-zinc-400 font-medium">
                          No 3-way invoice records match your search criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredThreeWayInvoices.map((inv, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50/70 transition-colors">
                          {/* Order ID & Date */}
                          <td className="py-3.5">
                            <div className="font-bold font-mono text-zinc-950">{inv.orderId}</div>
                            <div className="text-[11px] text-zinc-500">{inv.date} · {inv.customerName}</div>
                          </td>

                          {/* 1. Partner Laundry Invoice */}
                          <td className="py-3.5">
                            <div className="font-mono font-bold text-zinc-900">{inv.partnerInvoiceNo}</div>
                            <div className="text-[11px] text-zinc-600 font-medium">{inv.partnerName}</div>
                            <div className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                              {inv.isPartnerRegistered ? (
                                <span className="text-emerald-700 font-mono font-bold">
                                  GSTIN: {inv.partnerGstin}
                                </span>
                              ) : (
                                <span className="text-zinc-500 bg-zinc-100 px-1 py-0.2 rounded text-[9px]">
                                  Unregistered · Sec 9(5)
                                </span>
                              )}
                              <span>•</span>
                              <span>₹{inv.laundryAmount} + ₹{inv.laundryGst} GST</span>
                            </div>
                          </td>

                          {/* 2. Rider Delivery Receipt */}
                          <td className="py-3.5">
                            <div className="font-mono font-bold text-zinc-900">{inv.riderReceiptNo}</div>
                            <div className="text-[11px] text-zinc-600">{inv.riderName} (Gig Worker)</div>
                            <div className="text-[10px] text-zinc-500 mt-0.5">
                              ₹{inv.deliveryFee} Fee + ₹{inv.deliveryGst} GST
                            </div>
                          </td>

                          {/* 3. Platform Fee Invoice */}
                          <td className="py-3.5">
                            <div className="font-mono font-bold text-zinc-900">{inv.platformInvoiceNo}</div>
                            <div className="text-[11px] text-zinc-600">QuickPress Technologies</div>
                            <div className="text-[10px] text-zinc-500 mt-0.5">
                              ₹{inv.platformFee} Fee + ₹{inv.platformGst} GST
                            </div>
                          </td>

                          {/* Grand Total */}
                          <td className="py-3.5 text-right font-black tabular-nums text-zinc-950 text-sm">
                            ₹{inv.grandTotal.toFixed(2)}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedInvoice(inv)}
                              className="h-8 text-[11px] rounded-lg border-zinc-200 hover:bg-zinc-100"
                            >
                              <FileText className="size-3 mr-1 text-emerald-600" />
                              View 3-Split
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: GSTR-8 (1% TCS ON REGISTERED PARTNERS) */}
          {activeTab === "gstr8" && (
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-200 gap-2">
                <div>
                  <h3 className="text-sm font-black text-zinc-950 flex items-center gap-2">
                    <ShieldCheck className="size-4 text-purple-600" />
                    GSTR-8 TCS Statement (Section 52 - E-Commerce Operators)
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    1% Tax Collected at Source (0.5% CGST + 0.5% SGST) withheld from Registered Marketplace Sellers.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => alert("GSTR-8 JSON schema prepared for GST Portal upload.")}
                    className="h-8 text-xs rounded-xl border-zinc-200 font-bold"
                  >
                    <Download className="size-3.5 mr-1 text-purple-600" />
                    Export GSTR-8 JSON
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="pb-3 text-left">Partner Store</th>
                      <th className="pb-3 text-left">Registered GSTIN</th>
                      <th className="pb-3 text-left">City Hub</th>
                      <th className="pb-3 text-right">Gross Taxable Supplies</th>
                      <th className="pb-3 text-right">CGST TCS (0.5%)</th>
                      <th className="pb-3 text-right">SGST TCS (0.5%)</th>
                      <th className="pb-3 text-right">Total TCS (1%)</th>
                      <th className="pb-3 text-right">Portal Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredGstr8.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-zinc-400 font-medium">
                          No registered GST partner stores found for GSTR-8 filing.
                        </td>
                      </tr>
                    ) : (
                      filteredGstr8.map((row, i) => (
                        <tr key={i} className="hover:bg-zinc-50/70 transition-colors">
                          <td className="py-3.5 font-bold text-zinc-900">{row.businessName}</td>
                          <td className="py-3.5 font-mono font-bold text-emerald-800">{row.gstin}</td>
                          <td className="py-3.5 text-zinc-600">{row.city}</td>
                          <td className="py-3.5 text-right font-bold tabular-nums text-zinc-900">
                            ₹{row.taxableSupplies.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 text-right tabular-nums text-zinc-700">
                            ₹{row.cgstTcs.toFixed(2)}
                          </td>
                          <td className="py-3.5 text-right tabular-nums text-zinc-700">
                            ₹{row.sgstTcs.toFixed(2)}
                          </td>
                          <td className="py-3.5 text-right font-black tabular-nums text-purple-700 text-sm">
                            ₹{row.totalTcs.toFixed(2)}
                          </td>
                          <td className="py-3.5 text-right">
                            <Badge className="bg-purple-50 text-purple-700 border-purple-200 font-semibold text-[10px]">
                              {row.status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: B2B COMMISSION INVOICES (FOR PARTNER ITC) */}
          {activeTab === "b2b_invoices" && (
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-200 gap-2">
                <div>
                  <h3 className="text-sm font-black text-zinc-950 flex items-center gap-2">
                    <Building2 className="size-4 text-amber-600" />
                    B2B Platform Commission Tax Invoices (ITC Claimable)
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Official tax invoices issued by QuickPress Technologies to Registered Laundromat Partners for their Input Tax Credit (ITC).
                  </p>
                </div>
                <div className="text-xs text-zinc-500 font-medium">
                  Issuer GSTIN: <span className="font-mono font-bold text-zinc-950">09AAECQ1234F1Z5</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="pb-3 text-left">Invoice No & Date</th>
                      <th className="pb-3 text-left">Recipient Partner</th>
                      <th className="pb-3 text-left">Recipient GSTIN</th>
                      <th className="pb-3 text-right">Platform Commission (10%)</th>
                      <th className="pb-3 text-right">GST on Comm (18%)</th>
                      <th className="pb-3 text-right">Total Invoice Value</th>
                      <th className="pb-3 text-right">GSTR-2B Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {b2bInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-zinc-400 font-medium">
                          No B2B commission invoices generated yet.
                        </td>
                      </tr>
                    ) : (
                      b2bInvoices.map((inv, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50/70 transition-colors">
                          <td className="py-3.5">
                            <div className="font-mono font-bold text-zinc-950">{inv.invoiceNo}</div>
                            <div className="text-[11px] text-zinc-500">{inv.date}</div>
                          </td>
                          <td className="py-3.5 font-bold text-zinc-900">{inv.partnerName}</td>
                          <td className="py-3.5 font-mono font-bold text-emerald-800">{inv.partnerGstin}</td>
                          <td className="py-3.5 text-right font-bold tabular-nums text-zinc-900">
                            ₹{inv.baseCommission.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 text-right tabular-nums text-amber-700 font-bold">
                            ₹{inv.gstAmount.toFixed(2)}
                          </td>
                          <td className="py-3.5 text-right font-black tabular-nums text-zinc-950 text-sm">
                            ₹{inv.totalInvoiceValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 text-right">
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                              {inv.itcEligibility}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: STATUTORY FILING CALENDAR */}
          {activeTab === "calendar" && (
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-emerald-600" />
                  <h3 className="text-sm font-black text-zinc-950">Statutory Tax Filing Calendar & Deadlines</h3>
                </div>
                <span className="text-xs text-zinc-500 font-medium">Jurisdiction: {data?.jurisdiction || "Uttar Pradesh"}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="pb-3 text-left">Statutory Return / Form</th>
                      <th className="pb-3 text-left">Period</th>
                      <th className="pb-3 text-left">Filing Due Date</th>
                      <th className="pb-3 text-left">Description</th>
                      <th className="pb-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {calendar.map((c, i) => (
                      <tr key={i} className="hover:bg-zinc-50/70">
                        <td className="py-3.5 font-bold text-zinc-950 font-mono">{c.statutoryForm}</td>
                        <td className="py-3.5 text-zinc-700 font-medium">{c.period}</td>
                        <td className="py-3.5 text-zinc-950 font-bold flex items-center gap-1.5">
                          <Clock className="size-3 text-amber-500" />
                          {c.dueDate}
                        </td>
                        <td className="py-3.5 text-zinc-600">{c.description}</td>
                        <td className="py-3.5 text-right">
                          <Badge
                            className={
                              c.status === "COMPLETED" || c.status === "COMPLIANT"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }
                          >
                            {c.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. MODAL: 3-WAY INVOICE PREVIEW MODAL */}
          {selectedInvoice && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white border border-zinc-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                  <div>
                    <h3 className="text-base font-black text-zinc-950 flex items-center gap-2">
                      <Receipt className="size-5 text-emerald-600" />
                      Consolidated 3-Invoice Package
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Order #{selectedInvoice.orderId} · {selectedInvoice.date}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedInvoice(null)}
                    className="size-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Part 1: Partner Laundry Bill */}
                  <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-zinc-950 flex items-center gap-1.5 text-xs">
                        <span className="p-1 rounded bg-blue-100 text-blue-800 font-mono text-[10px]">QP-LND</span>
                        <span>1. Laundry Tax Invoice (Store Partner)</span>
                      </div>
                      <span className="font-mono font-bold text-xs text-zinc-800">{selectedInvoice.partnerInvoiceNo}</span>
                    </div>
                    <div className="text-xs text-zinc-600 flex justify-between">
                      <span>Store: <strong>{selectedInvoice.partnerName}</strong> ({selectedInvoice.isPartnerRegistered ? `GSTIN: ${selectedInvoice.partnerGstin}` : "Unregistered · Sec 9(5)"})</span>
                      <span className="font-bold tabular-nums">₹{selectedInvoice.laundryAmount.toFixed(2)} + ₹{selectedInvoice.laundryGst.toFixed(2)} GST</span>
                    </div>
                  </div>

                  {/* Part 2: Delivery Receipt */}
                  <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-zinc-950 flex items-center gap-1.5 text-xs">
                        <span className="p-1 rounded bg-purple-100 text-purple-800 font-mono text-[10px]">QP-DLV</span>
                        <span>2. Express Logistics & Delivery Receipt</span>
                      </div>
                      <span className="font-mono font-bold text-xs text-zinc-800">{selectedInvoice.riderReceiptNo}</span>
                    </div>
                    <div className="text-xs text-zinc-600 flex justify-between">
                      <span>Rider: <strong>{selectedInvoice.riderName}</strong> (Independent Delivery Partner)</span>
                      <span className="font-bold tabular-nums">₹{selectedInvoice.deliveryFee.toFixed(2)} + ₹{selectedInvoice.deliveryGst.toFixed(2)} GST</span>
                    </div>
                  </div>

                  {/* Part 3: Platform Convenience Invoice */}
                  <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-zinc-950 flex items-center gap-1.5 text-xs">
                        <span className="p-1 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px]">QP-PLT</span>
                        <span>3. Platform Convenience Fee Tax Invoice</span>
                      </div>
                      <span className="font-mono font-bold text-xs text-zinc-800">{selectedInvoice.platformInvoiceNo}</span>
                    </div>
                    <div className="text-xs text-zinc-600 flex justify-between">
                      <span>Issuer: <strong>QuickPress Technologies Pvt Ltd</strong> (GSTIN: 09AAECQ1234F1Z5)</span>
                      <span className="font-bold tabular-nums">₹{selectedInvoice.platformFee.toFixed(2)} + ₹{selectedInvoice.platformGst.toFixed(2)} GST</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-emerald-950">Grand Total Customer Payment</div>
                    <div className="text-[11px] text-emerald-700">All 3 legal services consolidated</div>
                  </div>
                  <div className="text-xl font-black text-emerald-950 tabular-nums">
                    ₹{selectedInvoice.grandTotal.toFixed(2)}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedInvoice(null)}
                    className="h-9 text-xs rounded-xl"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      alert(`Downloading 3-Way Consolidated PDF for ${selectedInvoice.orderId}`);
                      setSelectedInvoice(null);
                    }}
                    className="h-9 text-xs rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 font-bold"
                  >
                    <Download className="size-3.5 mr-1.5" />
                    Download Consolidated PDF
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
