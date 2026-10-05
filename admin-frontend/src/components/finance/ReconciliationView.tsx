import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchReconciliationSummary,
  fetchReconciliationRuns,
  resolveReconciliationRun,
} from "../../api/finance-api";
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  FileCheck,
  Building,
  CreditCard,
  Banknote,
  Check,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog";

interface ReconciliationViewProps {
  onInspectEntity?: (type: string, id: string) => void;
}

export const ReconciliationView: React.FC<ReconciliationViewProps> = ({ onInspectEntity }) => {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [page, setPage] = useState<number>(1);
  const [resolvingRun, setResolvingRun] = useState<any | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>("");

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["reconSummary"],
    queryFn: fetchReconciliationSummary,
  });

  const { data: runsData, isLoading: runsLoading } = useQuery({
    queryKey: ["reconRuns", selectedType, selectedStatus, page],
    queryFn: () =>
      fetchReconciliationRuns({
        recon_type: selectedType === "ALL" ? undefined : selectedType,
        status: selectedStatus === "ALL" ? undefined : selectedStatus,
        page,
        limit: 15,
      }),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ runId, notes }: { runId: string; notes: string }) =>
      resolveReconciliationRun(runId, notes),
    onSuccess: () => {
      toast.success("Discrepancy marked as resolved with audit trail.");
      setResolvingRun(null);
      setResolutionNotes("");
      queryClient.invalidateQueries({ queryKey: ["reconRuns"] });
      queryClient.invalidateQueries({ queryKey: ["reconSummary"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to resolve discrepancy");
    },
  });

  const summary = summaryData?.summary || {
    total_runs: 0,
    matched_count: 0,
    mismatch_count: 0,
    resolved_count: 0,
    total_unresolved_variance: 0,
    match_rate_percentage: 100,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "MATCHED":
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
            <CheckCircle2 className="size-3" /> MATCHED
          </span>
        );
      case "PARTIALLY_MATCHED":
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-fit">
            <AlertTriangle className="size-3" /> FEE VARIANCE
          </span>
        );
      case "MISMATCHED":
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-fit">
            <AlertTriangle className="size-3" /> MISMATCH
          </span>
        );
      case "RESOLVED":
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 w-fit">
            <FileCheck className="size-3" /> RESOLVED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 flex items-center gap-1 w-fit">
            {status}
          </span>
        );
    }
  };

  const getTypeIcon = (type: string) => {
    if (type.includes("GATEWAY")) return <CreditCard className="size-4 text-purple-600" />;
    if (type.includes("COD")) return <Banknote className="size-4 text-emerald-600" />;
    return <Building className="size-4 text-blue-600" />;
  };

  return (
    <div className="space-y-6">
      {/* 3-Way Reconciliation Header Banner */}
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 text-white p-6 rounded-2xl border border-zinc-700 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Scale className="size-6 text-amber-400" />
              <h2 className="text-xl font-black tracking-tight">3-Way Automated Reconciliation Engine</h2>
              <span className="px-2 py-0.5 text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-full">
                Zero Human Error
              </span>
            </div>
            <p className="text-sm text-zinc-300">
              Automated 3-way variance verification: Gateway (Razorpay/Stripe) ↔ Internal Orders ↔ Bank Payout Statements.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["reconSummary"] });
                queryClient.invalidateQueries({ queryKey: ["reconRuns"] });
                toast.success("Reconciliation records refreshed");
              }}
              className="bg-zinc-800 text-zinc-200 border-zinc-600 hover:bg-zinc-700 font-bold"
            >
              <RotateCcw className="size-3.5 mr-1.5" /> Refresh
            </Button>
          </div>
        </div>

        {/* 3-Way Process Flow Illustration */}
        <div className="mt-6 pt-5 border-t border-zinc-700/60 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-zinc-800/80 rounded-xl border border-zinc-700 flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 text-purple-300 rounded-lg">
              <CreditCard className="size-4" />
            </div>
            <div>
              <div className="font-bold text-zinc-200">1. Gateway Ingestion</div>
              <div className="text-zinc-400">Webhook settlement files parsed per transaction ID</div>
            </div>
          </div>
          <div className="p-3 bg-zinc-800/80 rounded-xl border border-zinc-700 flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-lg">
              <Scale className="size-4" />
            </div>
            <div>
              <div className="font-bold text-zinc-200">2. Algorithmic Match</div>
              <div className="text-zinc-400">Tolerance band comparison (±5% gateway fee tolerance)</div>
            </div>
          </div>
          <div className="p-3 bg-zinc-800/80 rounded-xl border border-zinc-700 flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-300 rounded-lg">
              <Building className="size-4" />
            </div>
            <div>
              <div className="font-bold text-zinc-200">3. Bank General Ledger</div>
              <div className="text-zinc-400">Final GL balanced journal posted to Account 1010</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Match Rate</div>
          <div className="mt-2 text-2xl font-black text-emerald-600">
            {summary.match_rate_percentage.toFixed(1)}%
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            {summary.matched_count} of {summary.total_runs} matched automatically
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Active Discrepancies</div>
          <div className="mt-2 text-2xl font-black text-rose-600">
            {summary.mismatch_count}
          </div>
          <div className="mt-1 text-xs text-zinc-500">Requires auditor review or resolution</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Unresolved Variance</div>
          <div className="mt-2 text-2xl font-black text-zinc-900">
            ₹{summary.total_unresolved_variance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-xs text-zinc-500">Net exposure across gateways & CDM</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Resolved Variances</div>
          <div className="mt-2 text-2xl font-black text-blue-600">
            {summary.resolved_count}
          </div>
          <div className="mt-1 text-xs text-zinc-500">Audit trail preserved with maker/checker</div>
        </div>
      </div>

      {/* Filter and Table Section */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-zinc-500" />
            <span className="font-bold text-sm text-zinc-800">Filter Verification Runs</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              className="text-xs font-medium border border-zinc-300 rounded-lg px-2.5 py-1.5 bg-white text-zinc-700"
            >
              <option value="ALL">All Reconciliation Types</option>
              <option value="GATEWAY_VS_BANK">Gateway vs Bank Payouts</option>
              <option value="COD_VS_CDM">COD Collection vs CDM Deposit</option>
              <option value="SETTLEMENT_VS_BANK_PAYOUT">Merchant Settlement vs Bank</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="text-xs font-medium border border-zinc-300 rounded-lg px-2.5 py-1.5 bg-white text-zinc-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="MATCHED">Matched Only</option>
              <option value="PARTIALLY_MATCHED">Partially Matched</option>
              <option value="MISMATCHED">Mismatched (Action Required)</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Recon Flow</th>
                <th className="py-3 px-4">External Source / Ref</th>
                <th className="py-3 px-4">Internal Entity Ref</th>
                <th className="py-3 px-4 text-right">External Amt</th>
                <th className="py-3 px-4 text-right">Internal Amt</th>
                <th className="py-3 px-4 text-right">Variance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {runsLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-400 font-medium">
                    Loading automated reconciliation logs...
                  </td>
                </tr>
              ) : runsData?.runs?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-400 font-medium">
                    No reconciliation runs found matching current filter criteria.
                  </td>
                </tr>
              ) : (
                runsData?.runs?.map((run) => (
                  <tr key={run.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-zinc-900 flex items-center gap-2">
                      {getTypeIcon(run.recon_type)}
                      <span className="truncate max-w-[140px]">{run.recon_type.replace(/_/g, " ")}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-800">{run.external_source}</div>
                      <div className="text-[11px] text-zinc-500 font-mono truncate max-w-[150px]">
                        {run.external_reference}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => onInspectEntity?.("order", run.internal_reference)}
                        className="font-mono text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        {run.internal_reference}
                        <Eye className="size-3" />
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-zinc-800">
                      ₹{run.external_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-zinc-800">
                      ₹{run.internal_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`font-bold ${
                          Math.abs(run.variance) < 0.01
                            ? "text-emerald-600"
                            : run.variance > 0
                            ? "text-blue-600"
                            : "text-rose-600"
                        }`}
                      >
                        {run.variance > 0 ? "+" : ""}
                        ₹{run.variance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(run.status)}</td>
                    <td className="py-3 px-4 text-right">
                      {run.status === "MISMATCHED" || run.status === "PARTIALLY_MATCHED" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setResolvingRun(run);
                            setResolutionNotes("");
                          }}
                          className="text-xs h-7 px-2.5 font-bold border-amber-300 text-amber-800 hover:bg-amber-50"
                        >
                          Resolve
                        </Button>
                      ) : (
                        <span className="text-[11px] text-zinc-400 font-medium">Reconciled</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {runsData && runsData.totalPages > 1 && (
          <div className="p-3 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-500">
            <span>
              Page {runsData.page} of {runsData.totalPages} ({runsData.total} total runs)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 text-xs font-bold"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= runsData.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 text-xs font-bold"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Resolution Dialog */}
      <Dialog open={!!resolvingRun} onOpenChange={(open) => !open && setResolvingRun(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <ShieldAlert className="size-5 text-amber-500" />
              Resolve Reconciliation Discrepancy
            </DialogTitle>
          </DialogHeader>

          {resolvingRun && (
            <div className="space-y-4 py-2 text-xs">
              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Reference:</span>
                  <span className="font-mono font-bold text-zinc-900">{resolvingRun.internal_reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">External Source:</span>
                  <span className="font-medium text-zinc-800">{resolvingRun.external_source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">External Amount:</span>
                  <span className="font-bold text-zinc-900">₹{resolvingRun.external_amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Internal Amount:</span>
                  <span className="font-bold text-zinc-900">₹{resolvingRun.internal_amount}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-zinc-200">
                  <span className="font-bold text-zinc-700">Variance:</span>
                  <span className="font-bold text-rose-600">₹{resolvingRun.variance}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Audit Notes / Resolution Justification (Required)
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Gateway MDR fee difference verified against monthly invoice INV-2026-03"
                  className="w-full h-20 p-2.5 text-xs border border-zinc-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setResolvingRun(null)} className="font-bold">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!resolutionNotes.trim() || resolveMutation.isPending}
              onClick={() => {
                if (resolvingRun) {
                  resolveMutation.mutate({ runId: resolvingRun.id, notes: resolutionNotes });
                }
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {resolveMutation.isPending ? "Resolving..." : "Confirm & Close Discrepancy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
