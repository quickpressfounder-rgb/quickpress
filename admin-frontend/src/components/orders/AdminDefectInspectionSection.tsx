import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  X,
  Loader2,
  ShieldAlert,
  Scale,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/shared/ui/dialog";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import type { GarmentDefect } from "../../api/orders";
import { overrideGarmentDefect } from "../../api/orders";

interface AdminDefectInspectionSectionProps {
  orderId: string;
  orderCode: string;
  defects: GarmentDefect[];
  onDefectUpdated?: (updated: GarmentDefect) => void;
}

export function AdminDefectInspectionSection({
  orderId,
  orderCode,
  defects,
  onDefectUpdated,
}: AdminDefectInspectionSectionProps) {
  const [activeDefects, setActiveDefects] = useState<GarmentDefect[]>(defects);
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);

  // Override Dialog State
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedDefect, setSelectedDefect] = useState<GarmentDefect | null>(null);
  const [targetStatus, setTargetStatus] = useState<"proceed_wash" | "return_unwashed">("proceed_wash");
  const [overrideNotes, setOverrideNotes] = useState("");
  const [submittingOverride, setSubmittingOverride] = useState(false);

  if (!defects || defects.length === 0) return null;

  const handleOpenOverride = (defect: GarmentDefect) => {
    setSelectedDefect(defect);
    setTargetStatus(defect.customer_status === "return_unwashed" ? "return_unwashed" : "proceed_wash");
    setOverrideNotes(defect.admin_override_notes || "");
    setOverrideModalOpen(true);
  };

  const handleSubmitOverride = async () => {
    if (!selectedDefect) return;
    if (!overrideNotes.trim()) {
      toast.error("Please enter mandatory QC audit notes for this override.");
      return;
    }

    setSubmittingOverride(true);
    try {
      const updated = await overrideGarmentDefect(orderId, selectedDefect.defect_id, {
        override_status: targetStatus,
        override_notes: overrideNotes.trim(),
      });

      setActiveDefects((prev) =>
        prev.map((d) => (d.defect_id === selectedDefect.defect_id ? updated : d)),
      );

      if (onDefectUpdated) {
        onDefectUpdated(updated);
      }

      toast.success("Admin QC Dispute Override applied successfully!", {
        description: `Garment status updated to: ${targetStatus === "proceed_wash" ? "Wash Approved" : "Return Unwashed"}`,
      });
      setOverrideModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit QC override.");
    } finally {
      setSubmittingOverride(false);
    }
  };

  return (
    <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-amber-600" />
          <h3 className="text-sm font-bold text-zinc-900">
            Pre-Wash QC Inspection &amp; Defect Proofs
          </h3>
        </div>
        <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
          {activeDefects.length} {activeDefects.length === 1 ? "Garment Tagged" : "Garments Tagged"}
        </span>
      </div>

      {/* List of Defects */}
      <div className="space-y-3">
        {activeDefects.map((defect) => {
          const isOverridden = Boolean(defect.admin_override_status);
          const effectiveStatus = defect.admin_override_status || defect.customer_status;

          return (
            <div
              key={defect.defect_id}
              className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-3 dark:border-zinc-800 dark:bg-zinc-900/40"
            >
              <div className="flex items-start gap-3.5">
                {/* Photo Thumbnail */}
                <div className="relative group shrink-0">
                  <img
                    src={defect.photo_url}
                    alt={defect.item_name}
                    onClick={() => setViewingPhotoUrl(defect.photo_url)}
                    className="size-18 rounded-xl object-cover border border-zinc-300 dark:border-zinc-700 cursor-pointer shadow-2xs hover:opacity-90 transition-opacity"
                  />
                  <button
                    type="button"
                    onClick={() => setViewingPhotoUrl(defect.photo_url)}
                    className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Eye className="size-4" />
                  </button>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-xs font-black text-zinc-900 dark:text-white truncate">
                      {defect.item_name}
                    </p>
                    <span className="rounded-md bg-zinc-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      {defect.defect_type.replace(/_/g, " ")}
                    </span>
                  </div>

                  <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">Store Note:</span>{" "}
                    {defect.description || "No notes provided by store."}
                  </p>

                  <p className="mt-0.5 text-[10px] text-zinc-400 font-mono">
                    Reported by: {defect.reported_by_name || defect.reported_by_role || "Store Partner"} ·{" "}
                    {new Date(defect.reported_at).toLocaleTimeString("en-IN", {
                      hour: "numeric",
                      minute: "2-digit",
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
              </div>

              {/* Status & Overrides Strip */}
              <div className="pt-2.5 border-t border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Customer Status */}
                  <span className="text-[11px] font-semibold text-zinc-500">Customer Consent:</span>
                  {defect.customer_status === "proceed_wash" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                      <CheckCircle2 className="size-3 text-emerald-600" /> Wash Approved With Care
                    </span>
                  ) : defect.customer_status === "return_unwashed" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
                      <XCircle className="size-3 text-rose-600" /> Return Item As-Is
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                      <Clock className="size-3 text-amber-600" /> Awaiting Customer Decision
                    </span>
                  )}

                  {defect.customer_note ? (
                    <span className="text-[11px] text-zinc-600 italic">
                      "{defect.customer_note}"
                    </span>
                  ) : null}
                </div>

                {/* Admin Override Action Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenOverride(defect)}
                  className="h-7 px-2.5 rounded-lg text-[11px] font-bold gap-1 border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200"
                >
                  <Scale className="size-3 text-indigo-600" />
                  <span>{isOverridden ? "Edit QC Override" : "QC Dispute Override"}</span>
                </Button>
              </div>

              {/* Show If Overridden */}
              {isOverridden && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-2.5 text-xs text-indigo-900 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold flex items-center gap-1.5 text-indigo-950">
                      <ShieldCheck className="size-4 text-indigo-700" />
                      Admin QC Decision Enforced:{" "}
                      <span className="uppercase underline">
                        {defect.admin_override_status === "proceed_wash"
                          ? "Approved Wash with Care"
                          : "Return Item Unwashed"}
                      </span>
                    </p>
                  </div>
                  {defect.admin_override_notes ? (
                    <p className="text-[11px] text-indigo-800 italic">
                      Audit Notes: "{defect.admin_override_notes}"
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* QC Override Modal */}
      <Dialog open={overrideModalOpen} onOpenChange={setOverrideModalOpen}>
        <DialogContent className="max-w-md bg-white border border-zinc-200 rounded-2xl p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-wider text-zinc-900 flex items-center gap-2">
              <Scale className="size-4 text-indigo-600" />
              Admin QC Dispute Override
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Override customer/store decision for item: <strong>{selectedDefect?.item_name}</strong>. This action is permanently logged in the audit trail.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div>
              <Label className="text-xs font-bold text-zinc-700">Enforced Resolution</Label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setTargetStatus("proceed_wash")}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                    targetStatus === "proceed_wash"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-200"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span>Approve Wash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetStatus("return_unwashed")}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                    targetStatus === "return_unwashed"
                      ? "border-rose-600 bg-rose-50 text-rose-950 ring-2 ring-rose-200"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  <XCircle className="size-4 text-rose-600" />
                  <span>Return Unwashed</span>
                </button>
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-zinc-700">QC Dispute Remarks (Required)</Label>
              <Textarea
                placeholder="E.g. Spoke with customer via phone support. Customer agreed to wash with specialized chemical waiver..."
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                rows={3}
                className="mt-1.5 rounded-xl text-xs border-zinc-300 focus:border-zinc-950"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOverrideModalOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={submittingOverride}
              onClick={handleSubmitOverride}
              className="rounded-xl text-xs font-bold bg-zinc-950 text-white hover:bg-zinc-800"
            >
              {submittingOverride ? (
                <Loader2 className="size-3.5 animate-spin mr-1" />
              ) : null}
              Confirm QC Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full-Screen Zoom Photo Modal */}
      {viewingPhotoUrl && (
        <div
          onClick={() => setViewingPhotoUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-xl max-h-[90vh] overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl p-2"
          >
            <button
              onClick={() => setViewingPhotoUrl(null)}
              className="absolute top-4 right-4 z-10 flex size-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black transition-colors"
            >
              <X className="size-5" />
            </button>
            <img
              src={viewingPhotoUrl}
              alt="Defect Inspection Full View"
              className="max-h-[80vh] w-auto object-contain mx-auto rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
