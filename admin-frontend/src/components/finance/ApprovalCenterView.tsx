import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  Unlock,
  AlertCircle,
  RefreshCw,
  FileCheck2,
  AlertTriangle,
  UserCheck,
} from "lucide-react";
import {
  fetchApprovalsCenter,
  processApprovalAction,
  fetchFinancialPeriods,
  closeFinancialPeriod,
  ApprovalRequest,
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
import { toast } from "sonner";

export function ApprovalCenterView() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [actionReason, setActionReason] = useState("");
  const [actionModalOpen, setActionModalOpen] = useState(false);

  // Period close state
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [periodCloseNotes, setPeriodCloseNotes] = useState("");
  const [periodModalOpen, setPeriodModalOpen] = useState(false);

  const { data: approvalsData, isLoading, refetch } = useQuery({
    queryKey: ["approvals-center"],
    queryFn: () => fetchApprovalsCenter(),
    staleTime: 30000,
  });

  const { data: periodsData, refetch: refetchPeriods } = useQuery({
    queryKey: ["financial-periods"],
    queryFn: () => fetchFinancialPeriods(),
    staleTime: 30000,
  });

  const approvalMutation = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: "APPROVE" | "REJECT"; reason: string }) =>
      processApprovalAction(id, action, reason),
    onSuccess: (res) => {
      toast.success(res?.message || "Action processed successfully");
      queryClient.invalidateQueries({ queryKey: ["approvals-center"] });
      setActionModalOpen(false);
      setSelectedRequest(null);
      setActionReason("");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to process approval action");
    },
  });

  const periodCloseMutation = useMutation({
    mutationFn: ({ periodId, notes }: { periodId: string; notes: string }) =>
      closeFinancialPeriod(periodId, notes),
    onSuccess: () => {
      toast.success("Financial period locked permanently");
      queryClient.invalidateQueries({ queryKey: ["financial-periods"] });
      setPeriodModalOpen(false);
      setSelectedPeriodId(null);
      setPeriodCloseNotes("");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to close financial period");
    },
  });

  const handleOpenAction = (req: ApprovalRequest, action: "APPROVE" | "REJECT") => {
    setSelectedRequest(req);
    setActionType(action);
    setActionReason(action === "APPROVE" ? "Approved in accordance with financial delegation" : "Rejected");
    setActionModalOpen(true);
  };

  const handleConfirmAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    approvalMutation.mutate({
      id: selectedRequest.id,
      action: actionType,
      reason: actionReason.trim(),
    });
  };

  const handleConfirmPeriodClose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPeriodId) return;
    periodCloseMutation.mutate({
      periodId: selectedPeriodId,
      notes: periodCloseNotes.trim() || "Month-end financial close completed",
    });
  };

  const requests = approvalsData?.approvals || [];
  const periods = periodsData?.periods || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-purple-50 text-purple-700 rounded-xl">
              <ShieldCheck className="size-5" />
            </span>
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Maker-Checker & Governance Center</h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Two-tier approval enforcement for sensitive financial adjustments and immutable monthly period locks.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetch();
            refetchPeriods();
          }}
          disabled={isLoading}
          className="h-9 text-xs rounded-xl"
        >
          <RefreshCw className={`size-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Segregation of Duties Governance Banner */}
      <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-4 flex items-start gap-3">
        <UserCheck className="size-5 text-purple-700 shrink-0 mt-0.5" />
        <div className="text-xs text-purple-900">
          <span className="font-bold">Segregation of Duties (SoD) Active:</span> Any financial transaction submitted by a maker requires an independent checker review. Creators cannot approve their own requests.
        </div>
      </div>

      {/* Approvals Queue */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-amber-500" />
            <h3 className="text-sm font-bold text-zinc-900">Pending Financial Requests</h3>
          </div>
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
            {requests.filter((r) => r.status === "PENDING").length} Action Required
          </Badge>
        </div>

        {requests.length === 0 ? (
          <p className="text-xs text-zinc-400 py-6 text-center">No pending approval requests in queue.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 font-semibold">
                  <th className="pb-3 text-left">Request ID</th>
                  <th className="pb-3 text-left">Type</th>
                  <th className="pb-3 text-left">Requested By</th>
                  <th className="pb-3 text-left">Reason / Notes</th>
                  <th className="pb-3 text-right">Amount (₹)</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50/70">
                    <td className="py-3 font-mono font-bold text-zinc-900">{r.id}</td>
                    <td className="py-3">
                      <Badge variant="outline" className="text-[10px]">
                        {r.type}
                      </Badge>
                    </td>
                    <td className="py-3 text-zinc-600 font-medium">{r.requestedBy}</td>
                    <td className="py-3 text-zinc-700 max-w-xs truncate">{r.reason}</td>
                    <td className="py-3 text-right font-mono font-bold text-zinc-900">
                      ₹{(r.amount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-center">
                      <Badge
                        className={
                          r.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : r.status === "REJECTED"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }
                      >
                        {r.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      {r.status === "PENDING" && (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => handleOpenAction(r, "APPROVE")}
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-2.5"
                          >
                            <CheckCircle2 className="size-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAction(r, "REJECT")}
                            className="h-7 text-xs text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50 rounded-lg px-2.5"
                          >
                            <XCircle className="size-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Financial Period Closing & Locks */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-zinc-700" />
            <h3 className="text-sm font-bold text-zinc-900">Accounting Period Governance & Locking</h3>
          </div>
          <span className="text-xs text-zinc-500">Locks prevent past journal modifications</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {periods.map((p) => (
            <div
              key={p.periodId}
              className={`rounded-2xl p-5 border ${
                p.isLocked ? "bg-zinc-50 border-zinc-300" : "bg-white border-zinc-200 shadow-2xs"
              }`}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-zinc-900">{p.name}</h4>
                <Badge
                  className={
                    p.isLocked
                      ? "bg-zinc-200 text-zinc-800 border-zinc-300"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }
                >
                  {p.isLocked ? "LOCKED" : "OPEN"}
                </Badge>
              </div>

              <div className="text-xs text-zinc-500 mt-2 space-y-1">
                <div>Period ID: <span className="font-mono text-zinc-700">{p.periodId}</span></div>
                {p.lockedAt && <div>Closed on: {new Date(p.lockedAt).toLocaleDateString("en-IN")}</div>}
                {p.lockedBy && <div>Closed by: {p.lockedBy}</div>}
              </div>

              {!p.isLocked && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedPeriodId(p.periodId);
                    setPeriodModalOpen(true);
                  }}
                  className="w-full mt-4 text-xs font-semibold text-zinc-800 rounded-xl"
                >
                  <Lock className="size-3.5 mr-1.5" />
                  Perform Period Close
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Maker-Checker Action Dialog */}
      <Dialog open={actionModalOpen} onOpenChange={setActionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === "APPROVE" ? "Approve Financial Action" : "Reject Financial Action"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "APPROVE"
                ? "This will execute the financial adjustment into the immutable ledger."
                : "This will decline the request and log the reason in the audit trail."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmAction} className="space-y-4 py-2">
            <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 text-xs space-y-1">
              <div>Type: <span className="font-bold">{selectedRequest?.type}</span></div>
              <div>Amount: <span className="font-bold text-zinc-900 font-mono">₹{selectedRequest?.amount}</span></div>
              <div>Requested By: <span className="font-bold">{selectedRequest?.requestedBy}</span></div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Reviewer Justification / Notes *</Label>
              <Input
                placeholder="Enter mandatory audit rationale..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="text-xs mt-1"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setActionModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={approvalMutation.isPending}
                className={
                  actionType === "APPROVE"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-rose-600 hover:bg-rose-700 text-white"
                }
              >
                {approvalMutation.isPending ? "Processing..." : `Confirm ${actionType}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Period Close Dialog */}
      <Dialog open={periodModalOpen} onOpenChange={setPeriodModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lock Accounting Period</DialogTitle>
            <DialogDescription>
              Locking a period permanently seals all historical journal entries and ledger logs. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmPeriodClose} className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Closing Notes / Auditor Sign-off</Label>
              <Input
                placeholder="e.g. Month-end reconciliations completed and verified."
                value={periodCloseNotes}
                onChange={(e) => setPeriodCloseNotes(e.target.value)}
                className="text-xs mt-1"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setPeriodModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={periodCloseMutation.isPending}
                className="bg-zinc-900 hover:bg-black text-white"
              >
                {periodCloseMutation.isPending ? "Locking..." : "Permanently Lock Period"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
