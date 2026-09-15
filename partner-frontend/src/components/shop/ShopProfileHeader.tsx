import {
  BadgeCheck,
  Building2,
  Camera,
  CheckCircle2,
  ImageIcon,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Power,
  ShieldAlert,
  ShieldX,
  Sparkles,
  Star,
  Store,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { usePartnerShop } from "../../context/PartnerShopContext";
import { shopStatusMeta, type ShopProfile, type ShopStatusId } from "../../data/partner-shop-mock";
import { compressImage } from "../../lib/image-compression";

const TONE_CLASS: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  muted: "bg-zinc-100 text-zinc-600 border-zinc-200",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  red: "bg-rose-50 text-rose-700 border-rose-200",
};

export function ShopStatusBadge({ status }: { status: ShopStatusId }) {
  const meta = shopStatusMeta(status);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider ${
        TONE_CLASS[meta.tone] ?? TONE_CLASS["muted"]
      }`}
    >
      <span className={`size-2 rounded-full ${meta.tone === "green" ? "bg-emerald-500 animate-pulse" : "bg-current"}`} />
      {meta.label}
    </span>
  );
}

function VerificationChip({ status }: { status: ShopProfile["verification"] }) {
  if (status === "verified") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-[11px] font-black text-emerald-700">
        <BadgeCheck className="size-3.5 fill-emerald-600 text-white" /> Verified Store
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200/80 px-2.5 py-1 text-[11px] font-black text-amber-800">
        <ShieldAlert className="size-3.5" /> Verification Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200/80 px-2.5 py-1 text-[11px] font-black text-rose-700">
      <ShieldX className="size-3.5" /> Action Required
    </span>
  );
}

/** Modern storefront cover + store identity hero for Shop Management. */
export function ShopProfileHeader({
  profile,
  status,
  galleryCount,
  onEdit,
  onChangeStatus,
}: {
  profile: ShopProfile;
  status: ShopStatusId;
  galleryCount: number;
  onEdit: () => void;
  onChangeStatus: () => void;
}) {
  const { uploadLogo, uploadBanner, activeServicesCount } = usePartnerShop();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const bannerImg = profile.banner || profile.bannerUrl || profile.cover;
  const logoImg = profile.logo || profile.logoUrl || profile.image;

  const handleBannerSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const dataUrl = await compressImage(file, {
        maxWidth: 1600,
        maxHeight: 1000,
        quality: 0.85,
      });
      await uploadBanner(dataUrl);
      toast.success("Shop cover banner updated! Customers will see this live.");
    } catch (err) {
      console.error("Banner upload error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to upload banner.");
    } finally {
      setUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  };

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const dataUrl = await compressImage(file, {
        maxWidth: 600,
        maxHeight: 600,
        quality: 0.85,
      });
      await uploadLogo(dataUrl);
      toast.success("Shop logo updated successfully!");
    } catch (err) {
      console.error("Logo upload error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to upload logo.");
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-0">
      {/* Hidden file inputs */}
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleBannerSelect}
      />
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleLogoSelect}
      />

      {/* 1. High-Resolution Cover Banner */}
      <div className="relative h-44 sm:h-56 w-full overflow-hidden rounded-3xl border border-zinc-200/80 bg-zinc-900 shadow-sm">
        {bannerImg ? (
          <img
            src={bannerImg}
            alt={`${profile.name} banner`}
            className="size-full object-cover"
          />
        ) : (
          <div className="relative flex size-full items-center justify-center bg-gradient-to-br from-emerald-800 via-teal-900 to-zinc-950 p-6 text-center">
            <div className="pointer-events-none space-y-1">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur-md">
                <Store className="size-6" />
              </div>
              <p className="text-sm font-black tracking-tight text-white">
                Upload Storefront Cover
              </p>
              <p className="text-xs text-white/70">
                Show customers your storefront & laundry machines
              </p>
            </div>
          </div>
        )}

        {/* Top Vignette Overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/40" />

        {/* Top bar over banner: Status pill on left, Upload Cover on right */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3.5 z-10">
          <ShopStatusBadge status={status} />

          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            disabled={uploadingBanner}
            className="flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-3 py-1.5 text-xs font-bold text-white shadow-md transition-all hover:bg-black/80 active:scale-95 cursor-pointer"
          >
            {uploadingBanner ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Camera className="size-3.5 text-emerald-400" />
            )}
            <span>{bannerImg ? "Change Cover" : "Upload Cover"}</span>
          </button>
        </div>
      </div>

      {/* 2. Store Identity Block (Floats on top of banner) */}
      <div className="relative z-10 -mt-10 mx-2 sm:mx-4 rounded-3xl border border-zinc-200/80 bg-white p-4.5 sm:p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            {/* Store Logo with Camera Trigger */}
            <div className="relative shrink-0">
              <div className="flex size-18 sm:size-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-amber-400 text-zinc-950 font-black text-2xl shadow-md">
                {logoImg ? (
                  <img
                    src={logoImg}
                    alt={`${profile.name} logo`}
                    className="size-full object-cover"
                  />
                ) : (
                  profile.name.slice(0, 2).toUpperCase() || "QP"
                )}
              </div>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                title="Change Store Logo"
                className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md transition-all hover:bg-emerald-700 active:scale-90 cursor-pointer"
              >
                {uploadingLogo ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Camera className="size-3.5" />
                )}
              </button>
            </div>

            {/* Title & Info */}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-black tracking-tight text-zinc-900 truncate">
                  {profile.name}
                </h1>
                <VerificationChip status={profile.verification} />
              </div>

              <p className="text-xs font-semibold text-zinc-500 flex flex-wrap items-center gap-1.5">
                <span>{profile.ownerName || "Partner"}</span>
                <span>·</span>
                <span className="font-bold text-zinc-700">ID: {profile.shopId}</span>
                {profile.city ? (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-0.5 text-zinc-600">
                      <MapPin className="size-3" /> {profile.city}
                    </span>
                  </>
                ) : null}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-bold text-zinc-700">
                  <Building2 className="size-3 text-zinc-500" />
                  {profile.category || "Laundry & Dry Clean"}
                </span>
                {profile.contactNumber ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-bold text-zinc-700">
                    <Phone className="size-3 text-zinc-500" />
                    {profile.contactNumber}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
            <button
              type="button"
              onClick={onEdit}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs font-black text-white shadow-xs transition-all hover:bg-zinc-800 active:scale-95 cursor-pointer"
            >
              <Pencil className="size-3.5 text-emerald-400" />
              <span>Edit Store Info</span>
            </button>

            <button
              type="button"
              onClick={onChangeStatus}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs font-bold text-zinc-800 shadow-2xs transition-all hover:bg-zinc-100 active:scale-95 cursor-pointer"
            >
              <Power className="size-3.5 text-zinc-500" />
              <span>Status</span>
            </button>
          </div>
        </div>

        {/* Store Bio / Description */}
        {profile.description ? (
          <div className="rounded-2xl bg-zinc-50/80 p-3 border border-zinc-100 text-xs font-medium leading-relaxed text-zinc-600">
            {profile.description}
          </div>
        ) : null}

        {/* 3-Pillars Quick Stat Tiles */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-100 text-center">
          <div className="rounded-2xl bg-zinc-50 p-2.5">
            <p className="flex items-center justify-center gap-1 text-sm font-black text-zinc-900">
              <Star className="size-3.5 fill-amber-500 text-amber-500" />
              <span>{profile.rating.toFixed(1)}</span>
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Rating ({profile.reviewCount})
            </p>
          </div>

          <div className="rounded-2xl bg-zinc-50 p-2.5">
            <p className="flex items-center justify-center gap-1 text-sm font-black text-zinc-900">
              <ImageIcon className="size-3.5 text-emerald-600" />
              <span>{galleryCount}</span>
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Store Photos
            </p>
          </div>

          <div className="rounded-2xl bg-zinc-50 p-2.5">
            <p className="flex items-center justify-center gap-1 text-sm font-black text-zinc-900">
              <Sparkles className="size-3.5 text-teal-600" />
              <span>{activeServicesCount}</span>
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Services Active
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
