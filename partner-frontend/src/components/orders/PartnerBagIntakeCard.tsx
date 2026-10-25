import { useState, useMemo } from "react";
import {
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  Tag,
  ShieldCheck,
  ArrowRight,
  Minus,
  Plus,
  Clock,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { PartnerOrder } from "@/shared/types/partner";
import { verifyPartnerBagIntake } from "@/api/partner/partner-orders-api";

interface PartnerBagIntakeCardProps {
  order: PartnerOrder;
  onIntakeVerified?: (updatedOrder: PartnerOrder) => void;
}

export function PartnerBagIntakeCard({ order, onIntakeVerified }: PartnerBagIntakeCardProps) {
  const doorstep = order.garmentVerification?.doorstepPickup;
  const partnerIntake = order.garmentVerification?.partnerIntake;

  const doorstepTag = order.bagTag || doorstep?.bagTag || "";
  const expectedPieces = useMemo(() => {
    if (doorstep?.piecesPickedUp) return doorstep.piecesPickedUp;
    if (order.items && order.items.length > 0) {
      return order.items.reduce((sum, it) => sum + (Number(it.qty) || 1), 0);
    }
    return order.itemCount || 1;
  }, [doorstep, order.items, order.itemCount]);

  // Form State
  const [tagInput, setTagInput] = useState(doorstepTag);
  const [piecesCount, setPiecesCount] = useState<number>(expectedPieces);
  const [showDiscrepancy, setShowDiscrepancy] = useState(false);
  const [discrepancyType, setDiscrepancyType] = useState<string>("piece_mismatch");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isVerified = Boolean(partnerIntake?.verified);
  const tagsMatch = Boolean(
    tagInput.trim() && doorstepTag && tagInput.trim().toUpperCase() === doorstepTag.trim().toUpperCase()
  );

  const handleVerify = async () => {
    const finalTag = tagInput.trim().toUpperCase() || doorstepTag;
    const piecesMismatch = piecesCount !== expectedPieces;
    const hasDiscrepancy = showDiscrepancy || piecesMismatch;

    setIsSubmitting(true);
    try {
      const updated = await verifyPartnerBagIntake(order.id, {
        bagTag: finalTag,
        piecesReceived: piecesCount,
        hasDiscrepancy,
        discrepancyType: hasDiscrepancy ? discrepancyType : undefined,
        notes: notes.trim(),
        intakeStatus: hasDiscrepancy ? "discrepancy" : "verified",
      });

      toast.success(
        hasDiscrepancy
          ? "Custody accepted with discrepancy note logged"
          : "Garment custody accepted & bag seal verified!"
      );
      if (onIntakeVerified) {
        onIntakeVerified(updated);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to verify garment intake");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. ALREADY VERIFIED STATE (MINIMAL PURE WHITE SUMMARY)
  if (isVerified) {
    const hasDisc = Boolean(partnerIntake?.hasDiscrepancy);
    return (
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 border border-zinc-200">
              <PackageCheck className="size-4 text-emerald-600" />
            </span>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-zinc-950">
                Garment Custody &amp; Bag Seal
              </h2>
              <p className="text-[10px] text-zinc-500 font-medium">Store Custody Confirmed</p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black border ${
              hasDisc
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-emerald-50 text-emerald-800 border-emerald-200"
            }`}
          >
            {hasDisc ? (
              <>
                <AlertTriangle className="size-3 text-amber-600" />
                Custody (Flagged)
              </>
            ) : (
              <>
                <CheckCircle2 className="size-3 text-emerald-600" />
                Custody Verified
              </>
            )}
          </span>
        </div>

        {/* Verification Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100">
            <span className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">
              Bag Seal Tag
            </span>
            <span className="font-mono font-black text-zinc-900 text-xs">
              🏷️ {partnerIntake?.bagTagReceived || order.bagTag || "QP-BAG-OK"}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100">
            <span className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">
              Pieces In-Store
            </span>
            <span className="font-black text-zinc-900 text-xs">
              {partnerIntake?.piecesReceived ?? expectedPieces} Garments
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">
              Intake Time
            </span>
            <span className="font-bold text-zinc-700 text-xs truncate block">
              {partnerIntake?.verifiedAt
                ? new Date(partnerIntake.verifiedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Verified"}
            </span>
          </div>
        </div>

        {hasDisc && (
          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-[11px]">
              <AlertCircle className="size-3.5 text-amber-700" />
              Store Intake Note:
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              {partnerIntake?.notes || `Discrepancy noted during handover (${partnerIntake?.discrepancyType || "piece mismatch"}).`}
            </p>
          </div>
        )}
      </div>
    );
  }

  // 2. INTAKE PENDING STATE (TACTILE PURE WHITE VERIFICATION CARD)
  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs space-y-3.5">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 border border-zinc-200">
            <PackageCheck className="size-4 text-zinc-800" />
          </span>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-950">
              Garment Intake &amp; Bag Seal
            </h2>
            <p className="text-[10px] text-zinc-500 font-medium">Verify Bag Seal from Captain</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-[10px] font-black text-zinc-800">
          <Clock className="size-3 text-zinc-500" />
          Awaiting Intake
        </span>
      </div>

      {/* Doorstep Manifest Header */}
      <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500 font-medium">Doorstep Bag Seal:</span>
          <span className="font-mono font-black text-zinc-950 px-2 py-0.5 bg-white border border-zinc-200 rounded-md">
            {doorstepTag ? `🏷️ ${doorstepTag}` : "Untagged Bag"}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500 font-medium">Captain Count at Doorstep:</span>
          <span className="font-black text-zinc-950">
            {expectedPieces} {expectedPieces === 1 ? "Garment" : "Garments"}
          </span>
        </div>
        {doorstep?.hasDiscrepancy && (
          <div className="pt-1.5 border-t border-zinc-200 text-[11px] text-amber-800 flex items-center gap-1 font-semibold">
            <AlertTriangle className="size-3 text-amber-600 shrink-0" />
            <span>Captain reported discrepancy during customer pickup: {doorstep.notes || "Count mismatch"}</span>
          </div>
        )}
      </div>

      {/* Interactive Verification Form */}
      <div className="space-y-3">
        {/* Seal Tag Input & Match Badge */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1">
              <Tag className="size-3 text-zinc-500" />
              Verify Bag Seal Tag #
            </label>
            {tagsMatch ? (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="size-2.5" /> Seal Matches
              </span>
            ) : null}
          </div>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value.toUpperCase())}
            placeholder="e.g. QP-BAG-8821"
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 font-mono text-xs font-bold text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none"
          />
        </div>

        {/* Piece Count Adjuster */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">
              Garments Received in Bag
            </label>
            {piecesCount !== expectedPieces && (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                Count Discrepancy ({piecesCount > expectedPieces ? `+${piecesCount - expectedPieces}` : piecesCount - expectedPieces})
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPiecesCount((prev) => Math.max(1, prev - 1))}
              className="flex size-9 items-center justify-center rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-800 active:scale-95 transition-all cursor-pointer font-bold"
            >
              <Minus className="size-3.5" />
            </button>

            <div className="flex-1 text-center py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl font-mono font-black text-sm text-zinc-950">
              {piecesCount} {piecesCount === 1 ? "Piece" : "Pieces"}
            </div>

            <button
              type="button"
              onClick={() => setPiecesCount((prev) => prev + 1)}
              className="flex size-9 items-center justify-center rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-800 active:scale-95 transition-all cursor-pointer font-bold"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Optional Discrepancy Flagging Toggle */}
        <div className="pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showDiscrepancy || piecesCount !== expectedPieces}
              onChange={(e) => setShowDiscrepancy(e.target.checked)}
              className="size-4 rounded border-zinc-300 text-zinc-950 focus:ring-0"
            />
            <span className="text-xs font-semibold text-zinc-700">
              Flag Broken Seal / Garment Discrepancy
            </span>
          </label>

          {(showDiscrepancy || piecesCount !== expectedPieces) && (
            <div className="mt-2.5 p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-xs">
              <div>
                <label className="text-[10px] font-bold text-amber-900 block uppercase mb-1">
                  Discrepancy Reason
                </label>
                <select
                  value={discrepancyType}
                  onChange={(e) => setDiscrepancyType(e.target.value)}
                  className="w-full rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs text-zinc-900 font-semibold focus:outline-none"
                >
                  <option value="piece_mismatch">Garment Count Does Not Match</option>
                  <option value="broken_seal">Bag Seal Was Broken / Tampered</option>
                  <option value="damaged_bag">Packaging / Bag Was Damaged</option>
                  <option value="other">Other Handover Issue</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-amber-900 block uppercase mb-1">
                  Intake Note for Audit
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Received 4 shirts instead of 5 reported by captain..."
                  rows={2}
                  className="w-full rounded-lg border border-amber-300 bg-white p-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleVerify}
          className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-300 text-white font-black text-xs py-2.5 px-4 shadow-2xs transition-all active:scale-98 cursor-pointer"
        >
          {isSubmitting ? (
            <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <ShieldCheck className="size-4" />
              <span>Accept Garment Custody</span>
              <ArrowRight className="size-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
