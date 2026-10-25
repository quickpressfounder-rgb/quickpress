import { useState } from "react";
import {
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  Tag,
  ShieldCheck,
  ArrowRight,
  Clock,
  Eye,
  X,
  Bike,
  Building2,
  Check,
  AlertCircle,
} from "lucide-react";
import type { AdminOrder } from "../../api/orders";

interface AdminBagCustodySectionProps {
  order: AdminOrder | any;
}

export function AdminBagCustodySection({ order }: AdminBagCustodySectionProps) {
  const doorstep = order?.garmentVerification?.doorstepPickup;
  const partnerIntake = order?.garmentVerification?.partnerIntake;

  const bagTag = order?.bagTag || doorstep?.bagTag || partnerIntake?.bagTagReceived || "";
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);

  // If no bag tag and neither pickup nor intake exists, return null or minimal state
  const hasCustodyData = Boolean(
    bagTag || doorstep?.verified || partnerIntake?.verified || order?.doorstepPiecesVerified
  );

  const doorstepPieces = doorstep?.piecesPickedUp ?? (order?.items?.length || 1);
  const intakePieces = partnerIntake?.piecesReceived ?? doorstepPieces;

  const hasPieceDiscrepancy = Boolean(
    partnerIntake?.verified && doorstep?.verified && doorstepPieces !== intakePieces
  );

  const hasDiscrepancy = Boolean(
    doorstep?.hasDiscrepancy || partnerIntake?.hasDiscrepancy || hasPieceDiscrepancy
  );

  const tagsMatch = Boolean(
    doorstep?.bagTag &&
      partnerIntake?.bagTagReceived &&
      doorstep.bagTag.trim().toUpperCase() === partnerIntake.bagTagReceived.trim().toUpperCase()
  );

  return (
    <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-zinc-900" />
          <h3 className="text-sm font-bold text-zinc-900">
            Chain of Custody &amp; Bag Seal Audit
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {bagTag && (
            <span className="font-mono text-xs font-bold text-zinc-800 bg-zinc-100 px-2.5 py-0.5 rounded-full border border-zinc-200 flex items-center gap-1">
              <Tag className="size-3 text-zinc-500" />
              {bagTag}
            </span>
          )}

          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
              hasDiscrepancy
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : partnerIntake?.verified
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-zinc-100 text-zinc-700 border-zinc-200"
            }`}
          >
            {hasDiscrepancy ? (
              <>
                <AlertTriangle className="size-3 text-amber-600" />
                Custody Discrepancy
              </>
            ) : partnerIntake?.verified ? (
              <>
                <CheckCircle2 className="size-3 text-emerald-600" />
                Store Custody Verified
              </>
            ) : (
              <>
                <Clock className="size-3 text-zinc-500" />
                In Transit / Pending Intake
              </>
            )}
          </span>
        </div>
      </div>

      {/* Custody Progression Stepper Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* STEP 1: DOORSTEP PICKUP (RIDER) */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-200/70">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-zinc-900 text-white">
                <Bike className="size-3.5" />
              </span>
              <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                1. Customer Doorstep Handover
              </span>
            </div>
            {doorstep?.verified || order?.doorstepPiecesVerified ? (
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                Verified ✓
              </span>
            ) : (
              <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 border border-zinc-200 px-1.5 py-0.2 rounded">
                Pending
              </span>
            )}
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Pickup Captain:</span>
              <span className="font-bold text-zinc-900">
                {doorstep?.verifiedBy || order?.rider || "Assigned Captain"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Tamper-Proof Seal Tag:</span>
              <span className="font-mono font-bold text-zinc-900">
                {doorstep?.bagTag || bagTag || "—"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Garment Pieces Picked:</span>
              <span className="font-black text-zinc-950">
                {doorstepPieces} Garments
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Handover Time:</span>
              <span className="font-medium text-zinc-700">
                {doorstep?.verifiedAt
                  ? new Date(doorstep.verifiedAt).toLocaleString()
                  : order?.placedAt || "—"}
              </span>
            </div>

            {doorstep?.notes && (
              <div className="pt-1.5 border-t border-zinc-200 text-[11px] text-amber-800">
                <strong>Captain Note:</strong> {doorstep.notes}
              </div>
            )}

            {doorstep?.bagPhotoUrl && (
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewingPhotoUrl(doorstep.bagPhotoUrl)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-zinc-100 text-zinc-900 rounded-lg border border-zinc-300 text-[11px] font-bold cursor-pointer transition-all"
                >
                  <Eye className="size-3" />
                  View Doorstep Seal Photo
                </button>
              </div>
            )}
          </div>
        </div>

        {/* STEP 2: STORE INTAKE (PARTNER) */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-200/70">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-zinc-900 text-white">
                <Building2 className="size-3.5" />
              </span>
              <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                2. Store Hub Intake Handshake
              </span>
            </div>
            {partnerIntake?.verified ? (
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                Custody Transferred ✓
              </span>
            ) : (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                Awaiting Store Arrival
              </span>
            )}
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Laundromat Store:</span>
              <span className="font-bold text-zinc-900">
                {partnerIntake?.verifiedBy || order?.partner || "QuickPress Partner Hub"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Verified Bag Seal:</span>
              <span className="font-mono font-bold text-zinc-900 flex items-center gap-1">
                {partnerIntake?.bagTagReceived || "—"}
                {partnerIntake?.verified && tagsMatch && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200">
                    Matched ✓
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Garments In-Store:</span>
              <span className="font-black text-zinc-950 flex items-center gap-1">
                {partnerIntake?.piecesReceived ?? "—"}
                {partnerIntake?.piecesReceived != null && (
                  <span
                    className={`text-[10px] font-bold px-1 rounded border ${
                      !hasPieceDiscrepancy
                        ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                        : "text-amber-800 bg-amber-50 border-amber-200"
                    }`}
                  >
                    {!hasPieceDiscrepancy ? "Exact Match" : "Count Diff"}
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Intake Time:</span>
              <span className="font-medium text-zinc-700">
                {partnerIntake?.verifiedAt
                  ? new Date(partnerIntake.verifiedAt).toLocaleString()
                  : "Pending"}
              </span>
            </div>

            {partnerIntake?.notes && (
              <div className="pt-1.5 border-t border-zinc-200 text-[11px] text-amber-800">
                <strong>Store Note:</strong> {partnerIntake.notes}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Discrepancy Alert Banner */}
      {hasDiscrepancy && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <AlertCircle className="size-4 text-amber-700 shrink-0" />
            Chain of Custody Discrepancy Flagged
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            {hasPieceDiscrepancy
              ? `Garment count discrepancy detected: Captain recorded ${doorstepPieces} garments at doorstep, while store recorded ${intakePieces} garments at intake.`
              : partnerIntake?.notes || doorstep?.notes || "Seal tag or condition issue reported during handover."}
          </p>
        </div>
      )}

      {/* Full-Screen Photo Zoom Modal */}
      {viewingPhotoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setViewingPhotoUrl(null)}
        >
          <div
            className="relative max-w-2xl max-h-[90vh] bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setViewingPhotoUrl(null)}
              className="absolute top-4 right-4 z-10 flex size-9 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black transition-all cursor-pointer"
            >
              <X className="size-5" />
            </button>
            <img
              src={viewingPhotoUrl}
              alt="Doorstep Bag Seal Proof"
              className="w-full h-auto max-h-[80vh] object-contain rounded-xl"
            />
            <div className="p-3 text-center text-xs font-mono text-zinc-300">
              🏷️ Doorstep Bag Seal Photo Proof · Order #{order.id}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
