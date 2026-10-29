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
    <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xs p-4 space-y-3.5 transition-all">
      {/* 1. Header with Status Pill */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 text-slate-900 shrink-0 shadow-2xs">
            <Tag className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900 leading-tight">
              Doorstep Garment Intake & Bag Seal
            </h4>
            <p className="text-[10.5px] font-medium text-slate-500">
              कस्टमर के सामने कपड़े गिनकर बैग सील करें
            </p>
          </div>
        </div>

        {isVerified ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
            <CheckCircle2 className="size-3" />
            Verified
          </span>
        ) : hasDiscrepancy ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
            <AlertTriangle className="size-3" />
            Count Differs
          </span>
        ) : (
          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
            Step 1 of 2
          </span>
        )}
      </div>

      {/* 2. Discrepancy Alert Banner */}
      {hasDiscrepancy && (
        <div className="p-2.5 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-start gap-2 text-amber-950">
          <Info className="size-4 shrink-0 mt-0.5 text-amber-700" />
          <p className="text-[11px] font-medium leading-snug">
            Customer booked <span className="font-black">{expectedPieces} pcs</span>, but counted is{" "}
            <span className="font-black">{doorstepPieces} pcs</span>. Please confirm with customer before sealing.
          </p>
        </div>
      )}

      {/* 3. Pieces Stepper & Bag Tag ID Inputs */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Pieces Counter */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/90">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-700">Garment Count</span>
            <span className="text-[10px] font-black text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">Exp: {expectedPieces}</span>
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setDoorstepPieces((p) => Math.max(1, p - 1))}
              className="size-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-slate-900 active:scale-95 transition-all text-base cursor-pointer shadow-2xs hover:bg-slate-100"
              title="Decrease pieces"
            >
              -
            </button>
            <span className="font-mono text-base font-black text-slate-950">
              {doorstepPieces} pcs
            </span>
            <button
              type="button"
              onClick={() => setDoorstepPieces((p) => p + 1)}
              className="size-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-slate-900 active:scale-95 transition-all text-base cursor-pointer shadow-2xs hover:bg-slate-100"
              title="Increase pieces"
            >
              +
            </button>
          </div>
        </div>

        {/* Bag Seal Tag ID */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/90">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-700">Bag Seal Tag</span>
            <button
              type="button"
              onClick={handleGenerateAutoTag}
              className="inline-flex items-center gap-1 text-[10px] font-black text-slate-900 bg-slate-200 hover:bg-slate-300 px-2 py-0.5 rounded-lg active:scale-95 transition-all cursor-pointer"
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
            className="w-full text-center font-mono font-black text-xs uppercase bg-white border border-slate-200 rounded-xl py-1.5 text-slate-900 focus:outline-none focus:border-slate-900 shadow-2xs"
          />
        </div>
      </div>

      {/* 4. Booked Items Breakdown Accordion */}
      {items.length > 0 && (
        <div className="pt-0.5">
          <button
            type="button"
            onClick={() => setShowItemsList((prev) => !prev)}
            className="w-full flex items-center justify-between py-1 px-2 text-[11px] font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <span>Booked Item Manifest ({items.length} items)</span>
            {showItemsList ? (
              <ChevronUp className="size-3.5 text-slate-500" />
            ) : (
              <ChevronDown className="size-3.5 text-slate-500" />
            )}
          </button>

          {showItemsList && (
            <div className="mt-1.5 p-2.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5 max-h-36 overflow-y-auto">
              {items.map((item, idx) => {
                const count = Number(item.quantity || item.qty || 1);
                const title = item.title || item.name || `Garment #${idx + 1}`;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-[11px] py-1 border-b border-slate-200/60 last:border-0"
                  >
                    <span className="text-slate-700 truncate max-w-[200px] font-medium">
                      {title}
                      {item.service && (
                        <span className="text-[9.5px] text-slate-400 ml-1">({item.service})</span>
                      )}
                    </span>
                    <span className="font-mono font-black text-slate-900 shrink-0">
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
          <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <img
                src={bagPhotoUrl}
                alt="Sealed bag proof"
                className="size-11 rounded-xl object-cover border border-slate-200 shadow-2xs"
              />
              <div>
                <span className="text-[11px] font-black text-slate-900 block leading-tight">
                  Sealed Bag Photo Saved
                </span>
                <span className="text-[10px] font-medium text-slate-500">
                  Tag: {bagTagCode || "Pending"} • {doorstepPieces} pcs
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBagPhotoUrl && setBagPhotoUrl("")}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
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
            className="w-full py-2 px-3 rounded-2xl border border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/70 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
          >
            <Camera className="size-4 text-slate-600" />
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
        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-all shadow-2xs font-medium"
      />
    </div>
  );
}
