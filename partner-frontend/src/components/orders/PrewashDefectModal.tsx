import { useState, useRef, type ChangeEvent } from "react";
import {
  Camera,
  Upload,
  X,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { DefectType, GarmentDefect } from "@/shared/types/partner";
import { reportGarmentDefect } from "@/api/partner/partner-defects-api";

interface PrewashDefectModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderCode: string;
  availableItems: { id?: string; name: string }[];
  onDefectReported: (defect: GarmentDefect) => void;
}

const DEFECT_CATEGORIES: { id: DefectType; label: string; icon: string }[] = [
  { id: "stain", label: "Stain / Daag", icon: "🔴" },
  { id: "torn_or_cut", label: "Torn / Cut / Hole", icon: "✂️" },
  { id: "broken_button", label: "Broken Button", icon: "🔘" },
  { id: "color_bleed_risk", label: "Color Bleed Risk", icon: "🎨" },
  { id: "burn_mark", label: "Burn / Iron Mark", icon: "⚠️" },
  { id: "missing_accessory", label: "Missing Part / Belt", icon: "🧷" },
  { id: "other", label: "Other Defect", icon: "❓" },
];

export function PrewashDefectModal({
  isOpen,
  onClose,
  orderId,
  orderCode,
  availableItems,
  onDefectReported,
}: PrewashDefectModalProps) {
  if (!isOpen) return null;

  const defaultItemName = availableItems.length > 0 ? availableItems[0].name : "";
  const [selectedItemName, setSelectedItemName] = useState<string>(defaultItemName || "Garment");
  const [customItemName, setCustomItemName] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<DefectType>("stain");
  const [description, setDescription] = useState<string>("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Compress captured photo via HTML5 Canvas
  const processImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1200;
        const maxHeight = 1200;
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
          const compressed = canvas.toDataURL("image/jpeg", 0.82);
          setPhotoDataUrl(compressed);
        } else {
          setPhotoDataUrl(e.target?.result as string);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    const finalItemName = selectedItemName === "__custom__" ? customItemName.trim() : selectedItemName.trim();
    if (!finalItemName) {
      toast.error("Please enter or select the garment name");
      return;
    }
    if (!photoDataUrl) {
      toast.error("Please capture or upload a photo of the defect");
      return;
    }

    setSubmitting(true);
    try {
      const logged = await reportGarmentDefect(orderId, {
        item_name: finalItemName,
        defect_type: selectedCategory,
        photo: photoDataUrl,
        description: description.trim(),
      });

      toast.success("Defect report logged & customer notified!", {
        description: `Pre-wash inspection saved for ${finalItemName}.`,
      });
      onDefectReported(logged);
      onClose();
    } catch (err: any) {
      toast.error("Failed to submit defect report", {
        description: err?.message || "Please check your connection and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-zinc-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 bg-zinc-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-zinc-900 text-white">
                <Camera className="size-4" />
              </span>
              <h2 className="text-base font-black text-zinc-950">Pre-Wash Defect Tagging</h2>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">Order #{orderCode} · Inspect before washing</p>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-700 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-5 space-y-4 flex-1 text-xs">
          {/* Garment Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
              1. Which Garment Has The Defect?
            </label>
            <select
              value={selectedItemName}
              onChange={(e) => setSelectedItemName(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-zinc-900 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950 shadow-sm"
            >
              {availableItems.map((item, idx) => (
                <option key={item.id || idx} value={item.name}>
                  {item.name}
                </option>
              ))}
              <option value="__custom__">+ Other Item (Type manually)</option>
            </select>

            {selectedItemName === "__custom__" && (
              <input
                type="text"
                placeholder="e.g. Silk Kurta, White Saree, Woolen Coat..."
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-xs text-zinc-900 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
              />
            )}
          </div>

          {/* Defect Category Pills */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
              2. Defect Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DEFECT_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs font-bold transition-all ${
                      isSelected
                        ? "border-zinc-950 bg-zinc-950 text-white shadow-sm"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                    }`}
                  >
                    <span className="text-sm">{cat.icon}</span>
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photo Capture / Upload */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
              3. Defect Photo Proof (Required)
            </label>

            {/* Hidden file inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {!photoDataUrl ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 py-5 px-3 text-center hover:bg-zinc-100/80 transition-colors cursor-pointer"
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-zinc-900 text-white shadow-sm">
                    <Camera className="size-5" />
                  </span>
                  <div>
                    <p className="font-bold text-zinc-950 text-xs">Take Photo Now</p>
                    <p className="text-[10px] text-zinc-500">Use phone camera directly</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 py-5 px-3 text-center hover:bg-zinc-100/80 transition-colors cursor-pointer"
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-white border border-zinc-200 text-zinc-700 shadow-sm">
                    <Upload className="size-5" />
                  </span>
                  <div>
                    <p className="font-bold text-zinc-950 text-xs">Upload from Gallery</p>
                    <p className="text-[10px] text-zinc-500">Pick saved image file</p>
                  </div>
                </button>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-xl border border-zinc-300 bg-zinc-100">
                <img
                  src={photoDataUrl}
                  alt="Defect Preview"
                  className="h-44 w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/70 p-2.5 backdrop-blur-sm">
                  <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald-400" /> Photo attached
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="rounded-lg bg-white/20 px-2 py-1 text-[10px] font-bold text-white hover:bg-white/30 transition-colors"
                    >
                      Retake
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoDataUrl("")}
                      className="rounded-lg bg-red-600/90 p-1 text-white hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Description / Notes */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
              4. Defect Location & Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Left collar ke paas oil stain hai, right pocket par cut..."
              className="w-full rounded-xl border border-zinc-300 bg-white p-3 text-xs text-zinc-900 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
            />
          </div>

          {/* Transparency Alert */}
          <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200/80 p-3 text-amber-900">
            <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-700" />
            <p className="text-[11px] leading-relaxed">
              This photo will be visible to the customer on their live tracking screen. They will be asked to either <strong>approve wash with care</strong> or <strong>request item return as-is</strong>.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-zinc-200 bg-zinc-50 px-5 py-3.5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !photoDataUrl}
            className="flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-2.5 text-xs font-black text-white hover:bg-zinc-800 disabled:opacity-50 disabled:pointer-events-none transition-colors shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Submitting...
              </>
            ) : (
              <>
                <Camera className="size-4" /> Submit Defect Report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
