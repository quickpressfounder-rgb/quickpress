import {
  Camera,
  ImagePlus,
  Images,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import type { GalleryImage } from "../../data/partner-shop-mock";
import { compressImage } from "../../lib/image-compression";

/** Modern real store photo gallery with upload & delete capabilities. */
export function ShopGallery({
  images,
  limit,
  onUpload,
  onRemove,
}: {
  images: GalleryImage[];
  limit: number;
  onUpload: (base64: string) => Promise<boolean>;
  onRemove: (idOrUrl: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFull = images.length >= limit;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const dataUrl = await compressImage(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.82,
      });
      const ok = await onUpload(dataUrl);
      if (ok) {
        toast.success("Store photo uploaded successfully!");
      } else {
        toast.error("Failed to upload photo.");
      }
    } catch (err) {
      console.error("Gallery upload error:", err);
      toast.error("Could not process image file.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Top Header Row with Upload Trigger */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-zinc-900">
            Store Photos & Machinery
          </p>
          <p className="text-[11px] font-medium text-zinc-500">
            {images.length} of {limit} photos uploaded
          </p>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isFull || uploading}
          className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-black text-white shadow-xs transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Camera className="size-3.5" />
          )}
          <span>{uploading ? "Uploading..." : "Add Photo"}</span>
        </button>
      </div>

      {/* Photo Grid */}
      {images.length === 0 ? (
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 p-6 text-center cursor-pointer transition-all hover:border-emerald-500 hover:bg-emerald-50/30"
        >
          <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-2xs">
            <ImagePlus className="size-6" />
          </div>
          <p className="mt-3 text-sm font-black text-zinc-900">
            Upload Store & Machine Photos
          </p>
          <p className="mt-1 max-w-xs text-xs font-medium text-zinc-500">
            Showcase your steam iron, front-load washers, and clean counter to win customer trust.
          </p>
          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-xs">
            <Plus className="size-3.5" /> Upload First Photo
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
          {images.map((image, idx) => (
            <div
              key={image.id || idx}
              className="group relative aspect-4/3 overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-100 shadow-2xs"
            >
              {image.url ? (
                <img
                  src={image.url}
                  alt={image.title}
                  onClick={() => setPreviewImage(image.url || null)}
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-zinc-200 text-zinc-400">
                  <Images className="size-6" />
                </div>
              )}

              {/* Gradient Overlay on Hover */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

              {/* Tag Pill */}
              <span className="absolute left-2 top-2 rounded-full bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white">
                #{idx + 1}
              </span>

              {/* Delete Button */}
              <button
                type="button"
                aria-label={`Remove photo ${idx + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(image.url || image.id);
                  toast.success("Photo removed");
                }}
                className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/70 text-rose-300 shadow-md backdrop-blur-md transition-all hover:bg-rose-600 hover:text-white active:scale-90"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}

          {/* Quick Add Placeholder if under limit */}
          {!isFull && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex aspect-4/3 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 p-2 text-zinc-500 transition-all hover:border-emerald-500 hover:bg-emerald-50/20 active:scale-95 cursor-pointer"
            >
              <Plus className="size-5 text-emerald-600" />
              <span className="mt-1 text-[11px] font-bold text-zinc-600">Add More</span>
            </button>
          )}
        </div>
      )}

      {/* Lightbox / Preview Modal */}
      {previewImage ? (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-fade-in"
        >
          <div className="relative max-w-2xl w-full max-h-[85vh] overflow-hidden rounded-3xl bg-zinc-900 shadow-2xl">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/90 active:scale-90"
            >
              <X className="size-5" />
            </button>
            <img
              src={previewImage}
              alt="Store Photo Full Preview"
              className="max-h-[80vh] w-full object-contain mx-auto"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

