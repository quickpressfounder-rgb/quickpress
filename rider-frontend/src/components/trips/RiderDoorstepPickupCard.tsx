import React, { useRef, useState } from "react";
import {
  Tag,
  Camera,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  Info,
} from "lucide-react";

export interface GarmentOrderItem {
  name?: string;
  title?: string;
  quantity?: number;
  qty?: number;
  service?: string;
  category?: string;
}

export interface RiderDoorstepPickupCardProps {
  expectedPieces?: number;
  initialPiecesCount?: number;
  doorstepPieces: number;
  setDoorstepPieces: React.Dispatch<React.SetStateAction<number>>;
  bagTagCode: string;
  setBagTagCode: (val: string) => void;
  doorstepNotes: string;
  setDoorstepNotes: (val: string) => void;
  bagPhotoUrl?: string;
  setBagPhotoUrl?: (val: string) => void;
  items?: GarmentOrderItem[];
  isVerified?: boolean;
}

export function RiderDoorstepPickupCard({
  expectedPieces: rawExpectedPieces,
  initialPiecesCount,
  doorstepPieces,
  setDoorstepPieces,
  bagTagCode,
  setBagTagCode,
  doorstepNotes,
  setDoorstepNotes,
  bagPhotoUrl,
  setBagPhotoUrl,
  items = [],
  isVerified = false,
}: RiderDoorstepPickupCardProps) {
  const expectedPieces = initialPiecesCount ?? rawExpectedPieces ?? 1;
  const [showItemsList, setShowItemsList] = useState(false);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasDiscrepancy = doorstepPieces !== expectedPieces && expectedPieces > 0;

  const handleGenerateAutoTag = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setBagTagCode(`QP-BAG-${randomNum}`);
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingPhoto(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 900;
        const maxHeight = 900;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
          if (setBagPhotoUrl) {
            setBagPhotoUrl(dataUrl);
          }
        }
        setIsCompressingPhoto(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-2xs p-3.5 space-y-3 transition-all">
      {/* 1. Header with Status Pill */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-zinc-900 text-white shrink-0">
            <Tag className="size-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-zinc-900 leading-tight">
              Doorstep Bag Seal & Pieces Check
            </h4>
            <p className="text-[10px] text-zinc-500">
              कस्टमर के सामने कपड़े गिनकर बैग सील करें
            </p>
          </div>
        </div>

        {isVerified ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
            <CheckCircle2 className="size-3" />
            Verified
          </span>
        ) : hasDiscrepancy ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
            <AlertTriangle className="size-3" />
            Count Differs
          </span>
        ) : (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 shrink-0">
            Step 1 of 2
          </span>
        )}
      </div>

      {/* 2. Discrepancy Alert Banner */}
      {hasDiscrepancy && (
        <div className="p-2 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-1.5 text-amber-900">
          <Info className="size-3.5 shrink-0 mt-0.5 text-amber-700" />
          <p className="text-[10px] font-medium leading-tight">
            Customer booked <span className="font-bold">{expectedPieces} pcs</span>, but you are counting{" "}
            <span className="font-bold">{doorstepPieces} pcs</span>. Please confirm with customer before sealing.
          </p>
        </div>
      )}

      {/* 3. Pieces Stepper & Bag Tag ID Inputs */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Pieces Counter */}
        <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200/90">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-zinc-700">Garment Count</span>
            <span className="text-[10px] font-bold text-zinc-400">Exp: {expectedPieces}</span>
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setDoorstepPieces((p) => Math.max(1, p - 1))}
              className="size-7 rounded-lg bg-white border border-zinc-200 flex items-center justify-center font-bold text-zinc-800 active:scale-95 transition-all text-sm cursor-pointer shadow-2xs hover:bg-zinc-100"
              title="Decrease pieces"
            >
              -
            </button>
            <span className="font-mono text-sm font-bold text-zinc-900">
              {doorstepPieces} pcs
            </span>
            <button
              type="button"
              onClick={() => setDoorstepPieces((p) => p + 1)}
              className="size-7 rounded-lg bg-white border border-zinc-200 flex items-center justify-center font-bold text-zinc-800 active:scale-95 transition-all text-sm cursor-pointer shadow-2xs hover:bg-zinc-100"
              title="Increase pieces"
            >
              +
            </button>
          </div>
        </div>

        {/* Bag Seal Tag ID */}
        <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200/90">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-zinc-700">Bag Seal Tag</span>
            <button
              type="button"
              onClick={handleGenerateAutoTag}
              className="inline-flex items-center gap-0.5 text-[10px] font-bold text-zinc-900 hover:text-zinc-700 cursor-pointer"
              title="Generate Random Tag Code"
            >
              <Sparkles className="size-2.5" />
              <span>Auto</span>
            </button>
          </div>
          <input
            type="text"
            value={bagTagCode}
            onChange={(e) => setBagTagCode(e.target.value.toUpperCase())}
            placeholder="QP-BAG-1082"
            maxLength={18}
            className="w-full text-center font-mono font-bold text-xs uppercase bg-white border border-zinc-200 rounded-lg py-1 text-zinc-900 focus:outline-none focus:border-zinc-500 shadow-2xs"
          />
        </div>
      </div>

      {/* 4. Booked Items Breakdown Accordion */}
      {items.length > 0 && (
        <div className="pt-0.5">
          <button
            type="button"
            onClick={() => setShowItemsList((prev) => !prev)}
            className="w-full flex items-center justify-between py-1 px-1.5 text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
          >
            <span>Booked Item Manifest ({items.length} items)</span>
            {showItemsList ? (
              <ChevronUp className="size-3.5 text-zinc-500" />
            ) : (
              <ChevronDown className="size-3.5 text-zinc-500" />
            )}
          </button>

          {showItemsList && (
            <div className="mt-1.5 p-2 bg-zinc-50 rounded-xl border border-zinc-200/80 space-y-1 max-h-36 overflow-y-auto">
              {items.map((item, idx) => {
                const count = Number(item.quantity || item.qty || 1);
                const title = item.title || item.name || `Garment #${idx + 1}`;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-[11px] py-0.5 border-b border-zinc-100 last:border-0"
                  >
                    <span className="text-zinc-700 truncate max-w-[200px]">
                      {title}
                      {item.service && (
                        <span className="text-[9px] text-zinc-400 ml-1">({item.service})</span>
                      )}
                    </span>
                    <span className="font-mono font-bold text-zinc-900 shrink-0">
                      x{count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. Photo Proof of Sealed Bag (Camera/Gallery) */}
      <div className="pt-0.5">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoCapture}
          className="hidden"
        />

        {bagPhotoUrl ? (
          <div className="flex items-center justify-between p-2 bg-zinc-50 border border-zinc-200 rounded-xl">
            <div className="flex items-center gap-2">
              <img
                src={bagPhotoUrl}
                alt="Sealed bag proof"
                className="size-10 rounded-lg object-cover border border-zinc-200 shadow-2xs"
              />
              <div>
                <span className="text-[11px] font-bold text-zinc-900 block leading-tight">
                  Sealed Bag Photo Saved
                </span>
                <span className="text-[10px] text-zinc-500">
                  Tag: {bagTagCode || "Pending"} • {doorstepPieces} pcs
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBagPhotoUrl && setBagPhotoUrl("")}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 transition-colors cursor-pointer"
              title="Remove photo"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isCompressingPhoto}
            className="w-full py-1.5 px-2.5 rounded-xl border border-dashed border-zinc-300 hover:border-zinc-400 bg-zinc-50/60 hover:bg-zinc-50 text-zinc-700 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Camera className="size-3.5 text-zinc-600" />
            <span>
              {isCompressingPhoto ? "Compressing Photo..." : "Take Bag Seal Photo (Optional)"}
            </span>
          </button>
        )}
      </div>

      {/* 6. Optional Notes Input */}
      <input
        type="text"
        value={doorstepNotes}
        onChange={(e) => setDoorstepNotes(e.target.value)}
        placeholder="Notes (optional): e.g. white shirt collar stain, torn pocket..."
        className="w-full text-[11px] bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-1.5 text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500 transition-all shadow-2xs"
      />
    </div>
  );
}
