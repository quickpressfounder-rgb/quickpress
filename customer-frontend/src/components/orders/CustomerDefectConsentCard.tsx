import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  X,
  Loader2,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import type { GarmentDefect } from "@/shared/types/order";
import { respondToGarmentDefect } from "@/api/customer/defect-api";

interface CustomerDefectConsentCardProps {
  orderId: string;
  orderCode: string;
  defects: GarmentDefect[];
  onDefectUpdated?: (updatedDefect: GarmentDefect) => void;
}

export function CustomerDefectConsentCard({
  orderId,
  orderCode,
  defects,
  onDefectUpdated,
}: CustomerDefectConsentCardProps) {
  const [activeDefects, setActiveDefects] = useState<GarmentDefect[]>(defects);
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [customNotes, setCustomNotes] = useState<Record<string, string>>({});

  if (!defects || defects.length === 0) return null;

  const handleDecision = async (
    defectId: string,
    action: "proceed_wash" | "return_unwashed",
  ) => {
    setRespondingId(defectId);
    const note = customNotes[defectId]?.trim() || "";

    try {
      const updated = await respondToGarmentDefect(orderId, defectId, {
        action,
        note,
      });

      setActiveDefects((prev) =>
        prev.map((d) => (d.defect_id === defectId ? updated : d)),
      );

      if (onDefectUpdated) {
        onDefectUpdated(updated);
      }

      if (action === "proceed_wash") {
        toast.success("Wash consent confirmed!", {
          description: "Our store partner has been notified to wash with specialized care.",
        });
      } else {
        toast.info("Return request confirmed", {
          description: "This garment will be returned unwashed safely.",
        });
      }
    } catch (err: any) {
      toast.error("Failed to submit decision", {
        description: err?.message || "Please check your network and try again.",
      });
    } finally {
      setRespondingId(null);
    }
  };

  const pendingCount = activeDefects.filter((d) => d.customer_status === "pending").length;

  return (
    <section className="mt-4">
      <div className="overflow-hidden rounded-3xl border border-amber-300/80 bg-white p-4.5 shadow-sm dark:bg-zinc-900 dark:border-amber-500/50">
        {/* Header Banner */}
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-xs">
            <AlertTriangle className="size-5" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-950 dark:text-amber-200">
                Pre-Wash Inspection Notice
              </h4>
              {pendingCount > 0 ? (
                <span className="rounded-full bg-amber-500 text-white px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                  Action Required ({pendingCount})
                </span>
              ) : (
                <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-0.5 text-[10px] font-bold">
                  ✓ Reviewed
                </span>
              )}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
              Our care team inspected your laundry before washing. Pre-existing stains or fabric issues were detected. Please approve how we should handle these items.
            </p>
          </div>
        </div>

        {/* List of Defects */}
        <div className="mt-4 space-y-3">
          {activeDefects.map((defect) => {
            const isPending = defect.customer_status === "pending";
            const isApproved = defect.customer_status === "proceed_wash";
            const isReturn = defect.customer_status === "return_unwashed";
            const isSubmitting = respondingId === defect.defect_id;

            return (
              <div
                key={defect.defect_id}
                className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/60"
              >
                <div className="flex items-start gap-3">
                  {/* Photo Thumbnail */}
                  <div className="relative group shrink-0">
                    <img
                      src={defect.photo_url}
                      alt={defect.item_name}
                      onClick={() => setViewingPhotoUrl(defect.photo_url)}
                      className="size-20 rounded-xl object-cover border border-zinc-300 dark:border-zinc-700 cursor-pointer transition-transform group-hover:scale-102"
                    />
                    <button
                      type="button"
                      onClick={() => setViewingPhotoUrl(defect.photo_url)}
                      className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Eye className="size-4" />
                    </button>
                  </div>

                  {/* Defect Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <p className="text-xs font-black text-zinc-950 dark:text-white truncate">
                        {defect.item_name}
                      </p>
                      <span className="rounded-md bg-zinc-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                        {defect.defect_type.replace(/_/g, " ")}
                      </span>
                    </div>

                    {defect.description ? (
                      <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">Store note:</span>{" "}
                        {defect.description}
                      </p>
                    ) : null}

                    {/* Status Pill */}
                    <div className="mt-2">
                      {isApproved ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <p className="flex items-center gap-1.5 text-xs font-black">
                            <CheckCircle2 className="size-4 text-emerald-600" /> Wash Approved With Care
                          </p>
                          {defect.customer_note ? (
                            <p className="mt-0.5 text-[10px] text-emerald-800 dark:text-emerald-400 italic">
                              "{defect.customer_note}"
                            </p>
                          ) : null}
                        </div>
                      ) : isReturn ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                          <p className="flex items-center gap-1.5 text-xs font-black">
                            <XCircle className="size-4 text-red-600" /> Return Unwashed (As-Is)
                          </p>
                          {defect.customer_note ? (
                            <p className="mt-0.5 text-[10px] text-red-800 dark:text-red-400 italic">
                              "{defect.customer_note}"
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                          <Clock className="size-3.5" /> Awaiting Your Decision
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Customer Decision Actions (When Pending) */}
                {isPending && (
                  <div className="mt-3.5 pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2.5">
                    <input
                      type="text"
                      placeholder="Add instructions (e.g. Try stain remover on collar)..."
                      value={customNotes[defect.defect_id] || ""}
                      onChange={(e) =>
                        setCustomNotes((prev) => ({
                          ...prev,
                          [defect.defect_id]: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleDecision(defect.defect_id, "proceed_wash")}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-950 px-3 py-2.5 text-xs font-black text-white hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-50 transition-all shadow-sm dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                      >
                        {isSubmitting ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-3.5" />
                        )}
                        <span>Wash With Care</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleDecision(defect.defect_id, "return_unwashed")}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-xs font-bold text-zinc-800 hover:bg-zinc-100 active:scale-[0.98] disabled:opacity-50 transition-all dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                      >
                        {isSubmitting ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <XCircle className="size-3.5 text-red-500" />
                        )}
                        <span>Return Item As-Is</span>
                      </button>
                    </div>

                    <p className="text-[10px] text-zinc-500 text-center">
                      Choosing <strong>Wash With Care</strong> authorizes our store to treat the garment.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

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
    </section>
  );
}
