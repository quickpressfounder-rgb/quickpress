import {
  AtSign,
  Building2,
  Camera,
  FileText,
  ImageIcon,
  Loader2,
  Phone,
  Store,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { FormField, SelectField, TextAreaField } from "../PartnerFormPrimitives";
import { BUSINESS_TYPES, type ShopProfile } from "../../data/partner-shop-mock";
import { usePartnerShop, type ShopEditableFields } from "../../context/PartnerShopContext";
import { compressImage } from "../../lib/image-compression";
import { ShopSheet } from "./ShopSheet";

type Errors = Partial<Record<keyof ShopEditableFields, string>>;

export function ShopEditSheet({
  profile,
  initial,
  open = true,
  onClose,
  onSave,
}: {
  profile?: ShopProfile;
  initial?: ShopEditableFields;
  open?: boolean;
  onClose: () => void;
  onSave: (next: Partial<ShopProfile>) => Promise<void> | void;
}) {
  const { uploadLogo, uploadBanner } = usePartnerShop();

  const baseProfile = profile || {
    name: initial?.name || "",
    description: initial?.description || "",
    contactNumber: initial?.contactNumber || "",
    email: initial?.email || "",
    gstNumber: initial?.gstNumber || "",
    businessType: initial?.businessType || "Laundromat",
    banner: "",
    bannerUrl: "",
    cover: "",
    logo: "",
    logoUrl: "",
    image: "",
  };

  const [form, setForm] = useState<ShopEditableFields>({
    name: baseProfile.name || initial?.name || "",
    description: baseProfile.description || initial?.description || "",
    contactNumber: baseProfile.contactNumber || initial?.contactNumber || "",
    email: baseProfile.email || initial?.email || "",
    gstNumber: baseProfile.gstNumber || initial?.gstNumber || "",
    businessType: baseProfile.businessType || initial?.businessType || "Laundromat",
  });

  const [bannerPreview, setBannerPreview] = useState<string>(
    baseProfile.banner || baseProfile.bannerUrl || baseProfile.cover || "",
  );
  const [logoPreview, setLogoPreview] = useState<string>(
    baseProfile.logo || baseProfile.logoUrl || baseProfile.image || "",
  );

  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm({
        name: baseProfile.name || initial?.name || "",
        description: baseProfile.description || initial?.description || "",
        contactNumber: baseProfile.contactNumber || initial?.contactNumber || "",
        email: baseProfile.email || initial?.email || "",
        gstNumber: baseProfile.gstNumber || initial?.gstNumber || "",
        businessType: baseProfile.businessType || initial?.businessType || "Laundromat",
      });
      setBannerPreview(baseProfile.banner || baseProfile.bannerUrl || baseProfile.cover || "");
      setLogoPreview(baseProfile.logo || baseProfile.logoUrl || baseProfile.image || "");
      setErrors({});
    }
  }, [open, profile, initial]);

  const set = <K extends keyof ShopEditableFields>(key: K, value: ShopEditableFields[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

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
      setBannerPreview(dataUrl);
      if (uploadBanner) {
        const url = await uploadBanner(dataUrl);
        setBannerPreview(url);
      }
      toast.success("Store banner uploaded successfully!");
    } catch (err) {
      console.error("Banner upload error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to upload banner");
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
      setLogoPreview(dataUrl);
      if (uploadLogo) {
        const url = await uploadLogo(dataUrl);
        setLogoPreview(url);
      }
      toast.success("Shop logo uploaded successfully!");
    } catch (err) {
      console.error("Logo upload error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const submit = async () => {
    const next: Errors = {};
    if (form.name.trim().length < 2) next.name = "Shop name needs at least 2 characters";
    if (form.description.trim().length > 0 && form.description.trim().length < 5)
      next.description = "Add at least 5 characters";
    if (
      form.contactNumber.trim() &&
      !/^\+?\d{10,13}$/.test(form.contactNumber.replace(/[\s-]/g, ""))
    )
      next.contactNumber = "Enter a valid phone number";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next.email = "Enter a valid email";

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setIsSaving(true);
    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
        contactNumber: form.contactNumber.trim(),
        email: form.email.trim(),
        gstNumber: form.gstNumber.trim().toUpperCase(),
        ...(bannerPreview ? { banner: bannerPreview, bannerUrl: bannerPreview } : {}),
        ...(logoPreview ? { logo: logoPreview, logoUrl: logoPreview } : {}),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ShopSheet
      open={open}
      title="Edit Shop Details"
      subtitle="Update store photos, identity & customer visible details"
      onClose={onClose}
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-zinc-200 bg-white py-3 text-xs font-bold text-zinc-700 transition-all hover:bg-zinc-50 active:scale-[0.97]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving || uploadingBanner || uploadingLogo}
            onClick={submit}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 py-3 text-xs font-black text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.97] disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
            <span>{isSaving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4 pb-2">
        {/* Hidden File Inputs */}
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

        {/* 1. Visual Store Banner & Logo Upload Block */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-3.5 shadow-2xs">
          <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-700">
            Store Banner & Logo
          </label>
          <p className="mt-0.5 text-[11px] font-medium text-zinc-500">
            These will be shown to customers on the Customer App storefront
          </p>

          {/* Banner Box */}
          <div className="relative mt-2.5 h-28 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-linear-to-r from-amber-100 via-amber-50 to-orange-100 shadow-inner">
            {bannerPreview ? (
              <img
                src={bannerPreview}
                alt="Store Banner"
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full flex-col items-center justify-center text-zinc-400">
                <ImageIcon className="size-6 opacity-60" />
                <span className="mt-1 text-[10px] font-bold">No Banner Selected</span>
              </div>
            )}

            {/* Change Banner Button */}
            <button
              type="button"
              disabled={uploadingBanner}
              onClick={() => bannerInputRef.current?.click()}
              className="absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-[10px] font-black text-white backdrop-blur-xs transition-all hover:bg-black/80 active:scale-95 disabled:opacity-50"
            >
              {uploadingBanner ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Camera className="size-3" />
              )}
              <span>{uploadingBanner ? "Uploading..." : bannerPreview ? "Change Banner" : "Upload Banner"}</span>
            </button>

            {/* Logo Avatar Overlap */}
            <div className="absolute -bottom-1 left-3">
              <div className="relative">
                <div className="flex size-14 items-center justify-center overflow-hidden rounded-2xl border-2 border-white bg-white shadow-md">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Shop Logo"
                      className="size-full object-cover"
                    />
                  ) : (
                    <Store className="size-6 text-amber-800" />
                  )}
                </div>

                <button
                  type="button"
                  disabled={uploadingLogo}
                  onClick={() => logoInputRef.current?.click()}
                  title="Change Shop Logo"
                  className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-amber-400 text-zinc-950 shadow-md ring-2 ring-white transition-all hover:bg-amber-300 active:scale-90 disabled:opacity-50"
                >
                  {uploadingLogo ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Camera className="size-3" strokeWidth={2.5} />
                  )}
                </button>
              </div>
            </div>
          </div>

          <p className="mt-2 text-right text-[10px] font-semibold text-zinc-400">
            Recommended: 1600x600 for Banner, 500x500 for Logo
          </p>
        </div>

        {/* 2. Form Fields */}
        <FormField
          id="shop-name"
          label="Shop Name"
          icon={Store}
          value={form.name}
          error={errors.name}
          placeholder="e.g. Shree Krishna Laundry"
          onChange={(event) => set("name", event.target.value)}
        />
        <TextAreaField
          id="shop-description"
          label="Description"
          value={form.description}
          error={errors.description}
          placeholder="Tell customers what makes your shop different (e.g. 100% Eco-friendly, German Steam Press)"
          onChange={(value) => set("description", value)}
        />
        <FormField
          id="shop-contact"
          label="Contact Number"
          icon={Phone}
          prefix="+91"
          inputMode="numeric"
          value={form.contactNumber}
          error={errors.contactNumber}
          placeholder="9876543210"
          onChange={(event) => set("contactNumber", event.target.value)}
        />
        <FormField
          id="shop-email"
          label="Email"
          icon={AtSign}
          type="email"
          value={form.email}
          error={errors.email}
          placeholder="partner@quickpress.in"
          onChange={(event) => set("email", event.target.value)}
        />
        <FormField
          id="shop-gst"
          label="GST Number"
          icon={FileText}
          value={form.gstNumber}
          error={errors.gstNumber}
          hint="15-character GSTIN (Optional)"
          placeholder="07AAAAA0000A1Z5"
          onChange={(event) => set("gstNumber", event.target.value)}
        />
        <SelectField
          id="shop-business-type"
          label="Business Type"
          icon={Building2}
          value={form.businessType}
          error={errors.businessType}
          options={BUSINESS_TYPES}
          onChange={(value) => set("businessType", value)}
        />
      </div>
    </ShopSheet>
  );
}
