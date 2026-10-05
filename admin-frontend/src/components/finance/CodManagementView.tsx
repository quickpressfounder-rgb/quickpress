import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  Send,
  Sliders,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchCodMetrics,
  fetchCodCollections,
  verifyCodDeposit,
  fetchOverdueRiders,
  updateCodRules,
  type CodCollectionRecord,
} from "@/api/finance-api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

export function CodManagementView() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Verification Modal State
  const [selectedDepositId, setSelectedDepositId] = useState<string | null>(null);
  const [verificationNotes, setVerificationNotes] = useState("");

  // Settings Modal State
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [maxHoldingLimit, setMaxHoldingLimit] = useState(5000);
  const [overdueHours, setOverdueHours] = useState(24);

  // Queries
  const { data: metricsData } = useQuery({
    queryKey: ["finance", "cod", "metrics"],
    queryFn: fetchCodMetrics,
  });

  const { data: collectionsData, isLoading } = useQuery({
    queryKey: ["finance", "cod", "collections", page, statusFilter, overdueOnly, search],
    queryFn: () =>
      fetchCodCollections({
        page,
        page_size: 25,
        status: statusFilter || undefined,
        overdue_only: overdueOnly,
        search: search.trim() || undefined,
      }),
  });

  const { data: overdueRidersData } = useQuery({
    queryKey: ["finance", "cod", "overdue-riders"],
    queryFn: fetchOverdueRiders,
  });

  // Verification Mutation
  const verifyMutation = useMutation({
    mutationFn: (data: { depositId: string; notes: string }) =>
      verifyCodDeposit(data.depositId, data.notes),
    onSuccess: (res) => {
      toast.success("Deposit verified! Reconciled into General Ledger & Bank balance.");
      setSelectedDepositId(null);
      setVerificationNotes("");
      queryClient.invalidateQueries({ queryKey: ["finance", "cod"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "ledger"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Verification failed");
    },
  });

  // Rules Mutation
  const rulesMutation = useMutation({
    mutationFn: (payload: { maxHoldingLimit: number; overdueHours: number }) =>
      updateCodRules(payload),
    onSuccess: () => {
      toast.success("Dynamic COD limits updated in database!");
      setIsRulesModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["finance", "cod", "metrics"] });
    },
  });

  const metrics = metricsData?.metrics;

  return (
    <div className="space-y-6">
      {/* Top COD Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase">Total COD Collected</span>
            <DollarSign className="size-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-zinc-900">
            ₹{metrics?.total_cod_collected?.toLocaleString("en-IN") ?? "0"}
          </div>
          <span className="text-[11px] text-zinc-400">
            Across {metrics?.total_cod_orders ?? 0} total cash orders
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase">Verified In Bank</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">
            ₹{metrics?.total_deposited_verified?.toLocaleString("en-IN") ?? "0"}
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold">
            Reconciled via General Ledger
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase">Current Outstanding</span>
            <Clock className="size-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">
            ₹{metrics?.total_outstanding?.toLocaleString("en-IN") ?? "0"}
          </div>
          <span className="text-[11px] text-amber-800 font-medium">
            Cash currently in Rider custody
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-rose-900 uppercase">Overdue Cash Alert</span>
            <ShieldAlert className="size-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600">
            ₹{metrics?.total_overdue?.toLocaleString("en-IN") ?? "0"}
          </div>
          <span className="text-[11px] text-rose-800 font-bold">
            {metrics?.overdue_riders_count ?? 0} rider(s) past 24h deadline
          </span>
        </div>
      </div>

      {/* Overdue Riders Urgent Section */}
      {overdueRidersData?.overdueRiders && overdueRidersData.overdueRiders.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-rose-600" />
              <span className="text-xs font-black text-rose-900 uppercase tracking-wider">
                Riders Requiring Immediate Cash Deposit ({overdueRidersData.count})
              </span>
            </div>
            <span className="text-[11px] text-rose-700 font-semibold">
              Automatically restricted from receiving new COD orders
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {overdueRidersData.overdueRiders.map((r) => (
              <div
                key={r.rider_id}
                className="p-3 bg-white rounded-xl border border-rose-200 shadow-2xs flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-zinc-900">{r.rider_name}</div>
                  <div className="text-[11px] text-zinc-500">{r.rider_phone || r.rider_id} • {r.city}</div>
                  <div className="text-xs font-black text-rose-600 mt-1">
                    Overdue: ₹{r.total_overdue_amount.toLocaleString("en-IN")} ({r.orders_count} orders)
                  </div>
                </div>

                <Button
                  size="xs"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 text-[11px]"
                  onClick={() => {
                    const text = encodeURIComponent(
                      `Hello ${r.rider_name}, you have ₹${r.total_overdue_amount} in pending QuickPress COD cash overdue past the 24-hour deadline. Please deposit this cash immediately to resume order assignments.`
                    );
                    window.open(`https://wa.me/91${r.rider_phone}?text=${text}`, "_blank");
                  }}
                >
                  <Send className="size-3" />
                  <span>WhatsApp Nudge</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 size-3.5 text-zinc-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Order ID, Rider ID, Bank UTR..."
              className="pl-9 text-xs"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-medium bg-white border border-zinc-200 rounded-lg px-3 py-2 text-zinc-700"
          >
            <option value="">All Statuses</option>
            <option value="CASH_COLLECTED">Cash in Custody</option>
            <option value="DEPOSITED">Deposit Submitted</option>
            <option value="VERIFIED">Verified & Bank Reconciled</option>
            <option value="OVERDUE">Overdue (&gt;24h)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs font-bold gap-1.5 bg-white"
            onClick={() => setIsRulesModalOpen(true)}
          >
            <Sliders className="size-3.5 text-zinc-500" />
            <span>Configure Risk Limits (₹{metricsData?.activeRules?.max_holding_limit ?? 5000})</span>
          </Button>
        </div>
      </div>

      {/* COD Collections Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase text-[10px]">
            <tr>
              <th className="py-3 px-4">Order ID</th>
              <th className="py-3 px-4">Rider</th>
              <th className="py-3 px-4">Collected Time</th>
              <th className="py-3 px-4 text-right">Order Amount</th>
              <th className="py-3 px-4 text-right">Pending In Hand</th>
              <th className="py-3 px-4">Bank UTR / Reference</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 font-medium">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-zinc-400 text-xs">
                  Loading COD collections...
                </td>
              </tr>
            ) : collectionsData?.collections && collectionsData.collections.length > 0 ? (
              collectionsData.collections.map((coll) => (
                <tr key={coll.id} className="hover:bg-zinc-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-zinc-900">
                    {coll.order_id}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-zinc-800">{coll.rider_id}</span>
                  </td>
                  <td className="py-3 px-4 text-zinc-500 text-[11px]">
                    {new Date(coll.collected_at).toLocaleString("en-IN", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-zinc-900">
                    ₹{coll.order_amount.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-black">
                    {coll.pending_amount > 0 ? (
                      <span className="text-amber-600">₹{coll.pending_amount.toFixed(2)}</span>
                    ) : (
                      <span className="text-emerald-600">₹0.00</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-zinc-600">
                    {coll.bank_utr || "-"}
                  </td>
                  <td className="py-3 px-4">
                    {coll.status === "VERIFIED" && (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[10px]">
                        ✓ Verified in Bank
                      </Badge>
                    )}
                    {coll.status === "DEPOSITED" && (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-bold text-[10px]">
                        Deposit Pending Review
                      </Badge>
                    )}
                    {coll.status === "CASH_COLLECTED" && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-[10px]">
                        In Custody
                      </Badge>
                    )}
                    {coll.status === "OVERDUE" && (
                      <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-extrabold text-[10px] animate-pulse">
                        🔴 Overdue (&gt;24h)
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {coll.status === "DEPOSITED" && (
                      <Button
                        size="xs"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                        onClick={() => setSelectedDepositId(coll.deposit_id || coll.id)}
                      >
                        Verify Credit
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-12 text-center text-zinc-400 text-xs">
                  No COD records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Deposit Verification Modal */}
      {selectedDepositId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-zinc-900">
              Verify Cash Deposit & Post to General Ledger
            </h3>
            <p className="text-xs text-zinc-600">
              Verifying this deposit will relieve the Rider&apos;s cash liability and post balanced journal entries:
              Debit Bank Operating Account (1010) and Credit Rider Cash (1030).
            </p>
            <Input
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              placeholder="e.g. Matched with HDFC Bank Statement UTR credit"
              className="text-xs"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedDepositId(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                onClick={() =>
                  verifyMutation.mutate({
                    depositId: selectedDepositId,
                    notes: verificationNotes,
                  })
                }
                disabled={verifyMutation.isPending}
              >
                Confirm Verification
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic COD Rules Modal */}
      {isRulesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-zinc-900">
              Update Dynamic COD Risk Controls (Zero-Hardcoded)
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-zinc-700">Rider Max Cash Ceiling (₹):</label>
                <Input
                  type="number"
                  value={maxHoldingLimit}
                  onChange={(e) => setMaxHoldingLimit(Number(e.target.value))}
                  className="text-xs mt-1"
                />
                <span className="text-[10px] text-zinc-500">
                  Rider cannot accept new COD orders if projected cash exceeds this limit.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700">Deposit Deadline (Hours):</label>
                <Input
                  type="number"
                  value={overdueHours}
                  onChange={(e) => setOverdueHours(Number(e.target.value))}
                  className="text-xs mt-1"
                />
                <span className="text-[10px] text-zinc-500">
                  Rider is automatically blocked from cash orders after this window.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsRulesModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold"
                onClick={() =>
                  rulesMutation.mutate({
                    maxHoldingLimit,
                    overdueHours,
                  })
                }
              >
                Save Limits to Database
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
