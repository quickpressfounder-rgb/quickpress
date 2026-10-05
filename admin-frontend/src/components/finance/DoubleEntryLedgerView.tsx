import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Scale,
  Lock,
  Unlock,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchGeneralLedger,
  fetchChartOfAccounts,
  fetchAccountingPeriods,
  lockAccountingPeriod,
  unlockAccountingPeriod,
  postLedgerReversal,
  type GeneralLedgerLine,
} from "@/api/finance-api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

export function DoubleEntryLedgerView() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [accountCodeFilter, setAccountCodeFilter] = useState<number | undefined>();
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");

  // Reversal Modal State
  const [reversalTarget, setReversalTarget] = useState<GeneralLedgerLine | null>(null);
  const [reversalReason, setReversalReason] = useState("");

  // Queries
  const { data: ledgerData, isLoading } = useQuery({
    queryKey: ["finance", "ledger", page, search, accountCodeFilter, selectedPeriod],
    queryFn: () =>
      fetchGeneralLedger({
        page,
        page_size: 25,
        search: search.trim() || undefined,
        account_code: accountCodeFilter,
        accounting_period: selectedPeriod || undefined,
      }),
  });

  const { data: coaData } = useQuery({
    queryKey: ["finance", "chart-of-accounts", selectedPeriod],
    queryFn: () => fetchChartOfAccounts(selectedPeriod || undefined),
  });

  const { data: periodsData } = useQuery({
    queryKey: ["finance", "accounting-periods"],
    queryFn: fetchAccountingPeriods,
  });

  // Reversal Mutation
  const reversalMutation = useMutation({
    mutationFn: (data: { entryId: string; reason: string }) =>
      postLedgerReversal(data.entryId, data.reason),
    onSuccess: (res) => {
      toast.success(res.message || "Offsetting reversal entry posted cleanly!");
      setReversalTarget(null);
      setReversalReason("");
      queryClient.invalidateQueries({ queryKey: ["finance", "ledger"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "chart-of-accounts"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to post reversal entry");
    },
  });

  // Period Lock Mutation
  const periodLockMutation = useMutation({
    mutationFn: (data: { period: string; lock: boolean; note: string }) =>
      data.lock
        ? lockAccountingPeriod(data.period, data.note)
        : unlockAccountingPeriod(data.period, data.note),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["finance", "accounting-periods"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to toggle period lock");
    },
  });

  const currentPeriodDoc = periodsData?.periods?.find((p) => p.period === (selectedPeriod || "2026-03"));
  const isCurrentPeriodLocked = currentPeriodDoc?.status === "LOCKED";

  return (
    <div className="space-y-6">
      {/* Top Banner: Trial Balance Mathematical Equation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase">System Debits</span>
            <Scale className="size-4 text-rose-500" />
          </div>
          <div className="text-xl font-black text-rose-600">
            ₹{coaData?.totalDebit?.toLocaleString("en-IN") ?? "0.00"}
          </div>
          <span className="text-[11px] text-zinc-400">Total Assets & Expenses</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase">System Credits</span>
            <Scale className="size-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600">
            ₹{coaData?.totalCredit?.toLocaleString("en-IN") ?? "0.00"}
          </div>
          <span className="text-[11px] text-zinc-400">Total Liabilities, Equity & Revenue</span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-900 uppercase">Trial Balance State</span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700">
            {coaData?.isBalanced ? "BALANCED (₹0.00 Variance)" : "UNBALANCED"}
          </div>
          <span className="text-[11px] text-emerald-800 font-semibold">
            Σ Debits == Σ Credits Mathematical Guarantee
          </span>
        </div>
      </div>

      {/* Period Lock Bar */}
      <div className="p-3.5 rounded-2xl bg-white border border-zinc-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <Calendar className="size-4 text-zinc-500" />
          <span className="text-xs font-bold text-zinc-700">Accounting Period:</span>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="">All Historical Periods</option>
            {periodsData?.periods?.map((p) => (
              <option key={p.period} value={p.period}>
                {p.period} ({p.status})
              </option>
            ))}
          </select>

          {isCurrentPeriodLocked ? (
            <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-extrabold text-[10px] flex items-center gap-1">
              <Lock className="size-3" /> Month-End Hard Locked
            </Badge>
          ) : (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold text-[10px] flex items-center gap-1">
              <Unlock className="size-3" /> Period Open for Postings
            </Badge>
          )}
        </div>

        {selectedPeriod && (
          <Button
            size="sm"
            variant={isCurrentPeriodLocked ? "outline" : "destructive"}
            className="text-xs font-bold gap-1.5"
            onClick={() => {
              const note = prompt(
                isCurrentPeriodLocked
                  ? "Enter mandatory justification to UNLOCK this period:"
                  : "Enter closing audit notes to HARD LOCK this period:"
              );
              if (note) {
                periodLockMutation.mutate({
                  period: selectedPeriod,
                  lock: !isCurrentPeriodLocked,
                  note,
                });
              }
            }}
          >
            {isCurrentPeriodLocked ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />}
            <span>{isCurrentPeriodLocked ? "Unlock Period" : "Hard Lock Month-End Close"}</span>
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 size-3.5 text-zinc-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Reference ID (QP-...), Description, or Account Name..."
            className="pl-9 text-xs font-medium"
          />
        </div>

        <select
          value={accountCodeFilter || ""}
          onChange={(e) => setAccountCodeFilter(e.target.value ? Number(e.target.value) : undefined)}
          className="text-xs font-medium bg-white border border-zinc-200 rounded-lg px-3 py-2 text-zinc-700"
        >
          <option value="">All Accounts (1000 - 5999)</option>
          {coaData?.accounts?.map((acc) => (
            <option key={acc.account_code} value={acc.account_code}>
              #{acc.account_code} - {acc.account_name} ({acc.account_type})
            </option>
          ))}
        </select>
      </div>

      {/* General Ledger Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase text-[10px]">
            <tr>
              <th className="py-3 px-4">Posting Date</th>
              <th className="py-3 px-4">Account Code & Name</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Reference</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4 text-right">Debit (DR)</th>
              <th className="py-3 px-4 text-right">Credit (CR)</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 font-medium">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-zinc-400 text-xs">
                  Loading General Ledger journal lines...
                </td>
              </tr>
            ) : ledgerData?.entries && ledgerData.entries.length > 0 ? (
              ledgerData.entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-zinc-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono text-zinc-500 text-[11px]">
                    {new Date(entry.posting_date).toLocaleString("en-IN", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-zinc-900">
                      #{entry.account_code} {entry.account_name}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {entry.account_type}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-zinc-700 font-semibold">
                      {entry.reference_id}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-zinc-600 max-w-xs truncate">
                    {entry.description}
                  </td>
                  <td className="py-3 px-4 text-right font-black">
                    {entry.debit > 0 ? (
                      <span className="text-rose-600">₹{entry.debit.toFixed(2)}</span>
                    ) : (
                      <span className="text-zinc-300">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-black">
                    {entry.credit > 0 ? (
                      <span className="text-emerald-600">₹{entry.credit.toFixed(2)}</span>
                    ) : (
                      <span className="text-zinc-300">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {!entry.is_reversal && (
                      <Button
                        size="xs"
                        variant="ghost"
                        className="text-zinc-500 hover:text-rose-600 gap-1 text-[11px]"
                        onClick={() => setReversalTarget(entry)}
                      >
                        <RotateCcw className="size-3" />
                        <span>Reverse</span>
                      </Button>
                    )}
                    {entry.is_reversal && (
                      <Badge className="bg-zinc-100 text-zinc-600 text-[9px]">Reversal</Badge>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-12 text-center text-zinc-400 text-xs">
                  No General Ledger records match current filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        {ledgerData && ledgerData.totalPages > 1 && (
          <div className="p-3 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-500">
            <span>
              Page {ledgerData.page} of {ledgerData.totalPages} ({ledgerData.total} entries)
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= ledgerData.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Reversal Confirmation Modal */}
      {reversalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <RotateCcw className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-zinc-900">Post Offsetting Reversal Entry</h3>
                <p className="text-xs text-zinc-500">
                  Target Entry #{reversalTarget.id} ({reversalTarget.account_name})
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              In accordance with financial compliance, records are never hard-deleted. A balanced reversal entry will be posted to neutralize this balance.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700">Mandatory Audit Reason:</label>
              <Input
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="e.g. Customer cancelled order within SLA / Duplicate adjustment"
                className="text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setReversalTarget(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={!reversalReason.trim() || reversalMutation.isPending}
                onClick={() =>
                  reversalMutation.mutate({
                    entryId: reversalTarget.id,
                    reason: reversalReason.trim(),
                  })
                }
              >
                Confirm Reversal Entry
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
