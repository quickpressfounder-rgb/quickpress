import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  ChevronRight,
  Clock,
  Eye,
  ImagePlus,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Toaster } from "@/shared/ui/sonner";
import { PullToRefresh } from "../components/dashboard/PullToRefresh";
import { PartnerLayout } from "../components/layout/PartnerLayout";
import { ShopProfileSkeleton } from "../components/shop/ShopSkeletons";
import { ShopStatusSheet } from "../components/shop/ShopStatusSheet";
import { ShopSuccessOverlay } from "../components/shop/ShopSuccessOverlay";
import { PartnerShopProvider, usePartnerShop } from "../context/PartnerShopContext";
import {
  BUSINESS_CATEGORIES,
  WEEKLY_OFF_OPTIONS,
  formatTimeLabel,
  shopStatusMeta,
} from "../data/partner-shop-mock";
import { compressImage } from "../lib/image-compression";
import { partnerRoutes } from "../navigation/partner-routes";

type StoreSectionTab = "overview" | "hours" | "coverage" | "photos" | "preview";

function formatCompactRevenue(amount: number): string {
  if (!amount) return "₹0";
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function ShopManagementContent() {
  const navigate = useNavigate();
  const {
    profile,
    gallery,
    hours,
    area,
    stats,
    status,
    activeServicesCount,
    isLoading,
    galleryLimit,
    refresh,
    updateProfile,
    uploadLogo,
    uploadBanner,
    setStatus,
    updateHours,
    updateArea,
    addImage,
    removeImage,
  } = usePartnerShop();

  const [activeTab, setActiveTab] = useState<StoreSectionTab>("overview");
  const [inlineEditOpen, setInlineEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Image upload states
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [bannerError, setBannerError] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Editable Profile Draft State
  const [profileDraft, setProfileDraft] = useState({
    name: "",
    category: "",
    contactNumber: "",
    email: "",
    description: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Editable Hours Draft State
  const [hoursDraft, setHoursDraft] = useState({
    openingTime: "08:00",
    closingTime: "21:00",
    weeklyOff: "None",
  });
  const [savingHours, setSavingHours] = useState(false);

  // Editable Coverage Draft State
  const [coverageDraft, setCoverageDraft] = useState({
    pickupRadiusKm: 8,
    deliveryRadiusKm: 8,
    city: "",
    area: "",
    servicePincodes: [] as string[],
  });
  const [newPin, setNewPin] = useState("");
  const [savingCoverage, setSavingCoverage] = useState(false);

  useEffect(() => {
    setProfileDraft({
      name: profile.name || "",
      category: profile.category || "Laundry & Dry Clean",
      contactNumber: profile.contactNumber || "",
      email: profile.email || "",
      description: profile.description || "",
    });
  }, [profile]);

  useEffect(() => {
    setHoursDraft({
      openingTime: hours.openingTime || "08:00",
      closingTime: hours.closingTime || "21:00",
      weeklyOff: hours.weeklyOff || "None",
    });
  }, [hours]);

  useEffect(() => {
    setCoverageDraft({
      pickupRadiusKm: area.pickupRadiusKm || 8,
      deliveryRadiusKm: area.deliveryRadiusKm || area.pickupRadiusKm || 8,
      city: area.city || profile.city || "",
      area: area.area || profile.area || "",
      servicePincodes: Array.isArray(area.servicePincodes) ? area.servicePincodes : [],
    });
  }, [area, profile.city, profile.area]);

  const rawBanner = profile.banner || profile.bannerUrl || profile.cover;
  const bannerImg =
    rawBanner && !bannerError && (rawBanner.startsWith("http") || rawBanner.startsWith("data:") || rawBanner.startsWith("/assets"))
      ? rawBanner
      : null;

  const rawLogo = profile.logo || profile.logoUrl || profile.image;
  const logoImg =
    rawLogo && !logoError && (rawLogo.startsWith("http") || rawLogo.startsWith("data:") || rawLogo.startsWith("/assets"))
      ? rawLogo
      : null;

  const statusInfo = shopStatusMeta(status);
  const statusPillClass =
    statusInfo.tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : statusInfo.tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-zinc-200 bg-zinc-100 text-zinc-600";

  const handleBannerSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    setBannerError(false);
    try {
      const dataUrl = await compressImage(file, { maxWidth: 1600, maxHeight: 1000, quality: 0.85 });
      await uploadBanner(dataUrl);
      toast.success("Store cover banner updated!");
    } catch (err) {
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
    setLogoError(false);
    try {
      const dataUrl = await compressImage(file, { maxWidth: 600, maxHeight: 600, quality: 0.85 });
      await uploadLogo(dataUrl);
      toast.success("Store logo updated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingGallery(true);
    try {
      const dataUrl = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.82 });
      const ok = await addImage(dataUrl);
      if (ok) {
        toast.success("Store photo added to gallery!");
      } else {
        toast.error("Failed to upload photo");
      }
    } catch {
      toast.error("Could not process image file");
    } finally {
      setUploadingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileDraft.name.trim().length < 2) {
      toast.error("Store name needs at least 2 characters");
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({
        name: profileDraft.name.trim(),
        category: profileDraft.category,
        contactNumber: profileDraft.contactNumber.trim(),
        email: profileDraft.email.trim(),
        description: profileDraft.description.trim(),
      });
      setInlineEditOpen(false);
      setSuccess("Store profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update store profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveHours = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingHours(true);
    try {
      await updateHours(hoursDraft);
      setSuccess("Store timings saved");
    } catch {
      toast.error("Failed to save store timings");
    } finally {
      setSavingHours(false);
    }
  };

  const handleSaveCoverage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCoverage(true);
    try {
      await Promise.all([
        updateArea({
          pickupRadiusKm: coverageDraft.pickupRadiusKm,
          deliveryRadiusKm: coverageDraft.deliveryRadiusKm,
          servicePincodes: coverageDraft.servicePincodes,
          city: coverageDraft.city.trim(),
          area: coverageDraft.area.trim(),
        }),
        updateProfile({
          city: coverageDraft.city.trim(),
          area: coverageDraft.area.trim(),
        }),
      ]);
      setSuccess("Coverage area & PINs saved");
    } catch {
      toast.error("Failed to save coverage settings");
    } finally {
      setSavingCoverage(false);
    }
  };

  const handleAddPin = () => {
    const clean = newPin.trim();
    if (!/^\d{6}$/.test(clean)) {
      toast.error("Enter a valid 6-digit pincode");
      return;
    }
    if (coverageDraft.servicePincodes.includes(clean)) {
      setNewPin("");
      return;
    }
    setCoverageDraft((prev) => ({
      ...prev,
      servicePincodes: [...prev.servicePincodes, clean],
    }));
    setNewPin("");
  };

  return (
    <PartnerLayout
      activeTab="profile"
      title="Store Profile"
      subtitle={`${statusInfo.label} · ${profile.category || "Laundry & Dry Clean"}`}
    >
      {/* Hidden File Inputs */}
      <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerSelect} />
      <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} />

      <div className="min-h-full bg-[#F8F9FA] pb-24 md:pb-12">
        {/* Clean Minimalist Top Bar & Editorial Underline Tabs */}
        <header className="sticky top-0 z-30 bg-white border-b border-zinc-200/80 app-header-safe">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="flex h-14 items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    if (window.history.length > 1) {
                      window.history.back();
                    } else {
                      navigate({ to: partnerRoutes.profile });
                    }
                  }}
                  className="flex size-8.5 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer shrink-0"
                  aria-label="Go back"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-950 truncate">
                  Store Profile
                </h1>
              </div>

              <button
                type="button"
                onClick={() => setStatusOpen(true)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer shrink-0 transition-colors ${statusPillClass}`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    statusInfo.tone === "green"
                      ? "bg-emerald-500 animate-pulse"
                      : statusInfo.tone === "amber"
                      ? "bg-amber-500"
                      : "bg-zinc-500"
                  }`}
                />
                <span>{statusInfo.label}</span>
              </button>
            </div>

            {/* Editorial Underline Horizontal Tab Slider */}
            <nav className="flex flex-nowrap overflow-x-auto no-scrollbar gap-5 border-t border-zinc-100">
              {(
                [
                  { id: "overview", label: "Overview" },
                  { id: "hours", label: "Timings & Status" },
                  { id: "coverage", label: "Coverage & PINs" },
                  { id: "photos", label: `Photos (${gallery.length})` },
                  { id: "preview", label: "Customer View" },
                ] as Array<{ id: StoreSectionTab; label: string }>
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 whitespace-nowrap py-2.5 px-0.5 text-[12.5px] border-b-2 transition-colors cursor-pointer ${
                    activeTab === tab.id
                      ? "border-zinc-950 text-zinc-950 font-bold"
                      : "border-transparent text-zinc-500 hover:text-zinc-900 font-semibold"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </header>

        {/* Main Workspace */}
        <div className="mx-auto w-full max-w-4xl px-4 py-4 sm:px-6 sm:py-6">
          <PullToRefresh onRefresh={refresh}>
            {isLoading ? (
              <ShopProfileSkeleton />
            ) : (
              <div className="space-y-4">

                {/* ==================== TAB 1: OVERVIEW ==================== */}
                {activeTab === "overview" && (
                  <div className="space-y-4">
                    {/* Clean Integrated Hero Card */}
                    <section className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-2xs">
                      {/* Cover Strip */}
                      <div className="relative h-32 sm:h-44 w-full bg-zinc-900">
                        {bannerImg ? (
                          <img
                            src={bannerImg}
                            alt={`${profile.name} cover`}
                            onError={() => setBannerError(true)}
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="size-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-emerald-950" />
                        )}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/15" />

                        <button
                          type="button"
                          onClick={() => bannerInputRef.current?.click()}
                          disabled={uploadingBanner}
                          className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/45 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md hover:bg-black/65 transition-all cursor-pointer"
                        >
                          {uploadingBanner ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Camera className="size-3.5" />
                          )}
                          <span>{bannerImg ? "Edit Cover" : "Add Cover"}</span>
                        </button>
                      </div>

                      {/* Profile Body */}
                      <div className="px-4 pb-4 sm:px-6 sm:pb-6">
                        <div className="relative -mt-8 mb-3 flex items-end justify-between gap-3">
                          <div className="relative">
                            <div className="flex size-16 sm:size-18 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-zinc-950 text-lg font-extrabold text-white shadow-md">
                              {logoImg ? (
                                <img
                                  src={logoImg}
                                  alt={`${profile.name} logo`}
                                  onError={() => setLogoError(true)}
                                  className="size-full object-cover"
                                />
                              ) : (
                                (profile.name || "QP").slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => logoInputRef.current?.click()}
                              disabled={uploadingLogo}
                              aria-label="Edit store logo"
                              className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-900 shadow-xs hover:bg-zinc-50 cursor-pointer"
                            >
                              {uploadingLogo ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <Camera className="size-3" />
                              )}
                            </button>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              profile.verification === "verified"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            <BadgeCheck className="size-3.5" />
                            {profile.verification === "verified" ? "Verified Partner" : "Pending Verification"}
                          </span>
                        </div>

                        <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-zinc-950">
                          {profile.name || "Merchant Store"}
                        </h2>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {profile.category || "Laundry & Dry Clean"}
                          {profile.city ? ` · ${profile.city}` : ""}
                          {profile.shopId ? ` · ID ${profile.shopId}` : ""}
                        </p>

                        {profile.description && (
                          <p className="mt-3 border-t border-zinc-100 pt-3 text-xs leading-relaxed text-zinc-600">
                            {profile.description}
                          </p>
                        )}

                        {/* Expandable Inline Profile Editor */}
                        {inlineEditOpen && (
                          <form
                            onSubmit={handleSaveProfile}
                            className="mt-4 space-y-3 border-t border-zinc-100 pt-4 text-xs"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                                  Store Display Name *
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={profileDraft.name}
                                  onChange={(e) => setProfileDraft((p) => ({ ...p, name: e.target.value }))}
                                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-950 focus:bg-white focus:border-zinc-950 outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                                  Service Category
                                </label>
                                <select
                                  value={profileDraft.category}
                                  onChange={(e) => setProfileDraft((p) => ({ ...p, category: e.target.value }))}
                                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-950 focus:bg-white focus:border-zinc-950 outline-none"
                                >
                                  {BUSINESS_CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>
                                      {cat}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                                  Customer Support Phone
                                </label>
                                <input
                                  type="tel"
                                  value={profileDraft.contactNumber}
                                  onChange={(e) => setProfileDraft((p) => ({ ...p, contactNumber: e.target.value }))}
                                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-mono font-semibold text-zinc-950 focus:bg-white focus:border-zinc-950 outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                                  Contact Email
                                </label>
                                <input
                                  type="email"
                                  value={profileDraft.email}
                                  onChange={(e) => setProfileDraft((p) => ({ ...p, email: e.target.value }))}
                                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-950 focus:bg-white focus:border-zinc-950 outline-none"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                                Store Tagline / Bio
                              </label>
                              <textarea
                                rows={2}
                                value={profileDraft.description}
                                onChange={(e) => setProfileDraft((p) => ({ ...p, description: e.target.value }))}
                                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-950 focus:bg-white focus:border-zinc-950 outline-none"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setInlineEditOpen(false)}
                                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={savingProfile}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 cursor-pointer"
                              >
                                {savingProfile && <Loader2 className="size-3.5 animate-spin" />}
                                Save Details
                              </button>
                            </div>
                          </form>
                        )}

                        <div className="mt-4 grid grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={() => setInlineEditOpen((prev) => !prev)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-zinc-950 py-2.5 px-3 text-xs font-semibold text-white hover:bg-zinc-800 active:scale-[0.98] transition-all cursor-pointer"
                          >
                            <Pencil className="size-3.5" />
                            <span>{inlineEditOpen ? "Close Editor" : "Edit Profile"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab("preview")}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white py-2.5 px-3 text-xs font-semibold text-zinc-900 hover:bg-zinc-50 active:scale-[0.98] transition-all cursor-pointer"
                          >
                            <Eye className="size-3.5" />
                            <span>App Preview</span>
                          </button>
                        </div>
                      </div>
                    </section>

                    {/* Classic 3-Metric Divider Strip */}
                    <section className="grid grid-cols-3 divide-x divide-zinc-100 rounded-2xl border border-zinc-200/80 bg-white py-3.5 text-center shadow-2xs">
                      <div className="px-2">
                        <p className="text-[15px] font-extrabold text-zinc-950">{profile.rating.toFixed(1)}</p>
                        <p className="mt-0.5 text-[10.5px] font-medium text-zinc-500">Store Rating</p>
                      </div>
                      <div className="px-2">
                        <p className="text-[15px] font-extrabold text-zinc-950">
                          {stats.totalOrders.toLocaleString("en-IN")}
                        </p>
                        <p className="mt-0.5 text-[10.5px] font-medium text-zinc-500">Total Orders</p>
                      </div>
                      <div className="px-2">
                        <p className="text-[15px] font-extrabold text-zinc-950">
                          {formatCompactRevenue(stats.revenue)}
                        </p>
                        <p className="mt-0.5 text-[10.5px] font-medium text-zinc-500">Revenue</p>
                      </div>
                    </section>

                    {/* Classic Grouped Store Configuration List */}
                    <section>
                      <h3 className="mb-2 pl-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                        Store Configuration
                      </h3>
                      <div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white divide-y divide-zinc-100 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setActiveTab("hours")}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-zinc-50/80 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="flex size-9 items-center justify-center rounded-xl border border-zinc-100 bg-zinc-50 text-zinc-900 shrink-0">
                              <Clock className="size-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold text-zinc-950">Opening Hours &amp; Weekly Off</p>
                              <p className="text-[11.5px] text-zinc-500 truncate">
                                {formatTimeLabel(hours.openingTime)} – {formatTimeLabel(hours.closingTime)} ·{" "}
                                {hours.weeklyOff === "None" ? "Open all days" : `${hours.weeklyOff} off`}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="size-4 text-zinc-400 shrink-0" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab("coverage")}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-zinc-50/80 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="flex size-9 items-center justify-center rounded-xl border border-zinc-100 bg-zinc-50 text-zinc-900 shrink-0">
                              <MapPin className="size-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold text-zinc-950">Pickup Radius &amp; PIN Zones</p>
                              <p className="text-[11.5px] text-zinc-500 truncate">
                                {area.pickupRadiusKm || 8} km reach
                                {area.servicePincodes?.length ? ` · ${area.servicePincodes.length} service PINs` : ""}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="size-4 text-zinc-400 shrink-0" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab("photos")}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-zinc-50/80 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="flex size-9 items-center justify-center rounded-xl border border-zinc-100 bg-zinc-50 text-zinc-900 shrink-0">
                              <Camera className="size-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold text-zinc-950">Storefront &amp; Equipment Gallery</p>
                              <p className="text-[11.5px] text-zinc-500 truncate">
                                {gallery.length} of {galleryLimit} photos uploaded
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="size-4 text-zinc-400 shrink-0" />
                        </button>

                        <button
                          type="button"
                          onClick={() => navigate({ to: partnerRoutes.services })}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-zinc-50/80 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="flex size-9 items-center justify-center rounded-xl border border-zinc-100 bg-zinc-50 text-zinc-900 shrink-0">
                              <Sparkles className="size-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold text-zinc-950">Services &amp; Price Catalog</p>
                              <p className="text-[11.5px] text-zinc-500 truncate">
                                {activeServicesCount} active laundry &amp; dry clean items
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="size-4 text-zinc-400 shrink-0" />
                        </button>
                      </div>
                    </section>
                  </div>
                )}

                {/* ==================== TAB 2: TIMINGS & STATUS ==================== */}
                {activeTab === "hours" && (
                  <div className="space-y-4">
                    <form onSubmit={handleSaveHours} className="rounded-3xl border border-zinc-200/80 bg-white p-4 sm:p-5 space-y-4 shadow-2xs">
                      <h3 className="text-sm font-bold text-zinc-950">Daily Operating Hours</h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Opening Time</label>
                          <input
                            type="time"
                            value={hoursDraft.openingTime}
                            onChange={(e) => setHoursDraft((h) => ({ ...h, openingTime: e.target.value }))}
                            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-mono font-bold text-zinc-950 focus:bg-white focus:border-zinc-950 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Closing Time</label>
                          <input
                            type="time"
                            value={hoursDraft.closingTime}
                            onChange={(e) => setHoursDraft((h) => ({ ...h, closingTime: e.target.value }))}
                            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-mono font-bold text-zinc-950 focus:bg-white focus:border-zinc-950 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Weekly Rest Day</label>
                        <select
                          value={hoursDraft.weeklyOff}
                          onChange={(e) => setHoursDraft((h) => ({ ...h, weeklyOff: e.target.value }))}
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-semibold text-zinc-950 focus:bg-white focus:border-zinc-950 outline-none"
                        >
                          {WEEKLY_OFF_OPTIONS.map((day) => (
                            <option key={day} value={day}>
                              {day === "None" ? "None (Open All 7 Days)" : `${day} Closed`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={savingHours}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-950 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 cursor-pointer"
                      >
                        {savingHours && <Loader2 className="size-3.5 animate-spin" />}
                        Save Timings
                      </button>
                    </form>

                    {/* Live Availability Switches wired to setStatus */}
                    <div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white divide-y divide-zinc-100 shadow-2xs">
                      <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                        <div>
                          <p className="text-[13px] font-bold text-zinc-950">Accepting New Orders</p>
                          <p className="text-[11px] text-zinc-500">Pause intake during heavy machine load</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={status === "online"}
                          onClick={async () => {
                            const next = status === "online" ? "busy" : "online";
                            await setStatus(next);
                            toast.success(next === "online" ? "Now accepting new orders" : "Order intake paused (Busy)");
                          }}
                          className={`relative inline-flex h-6.5 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                            status === "online" ? "bg-emerald-500" : "bg-zinc-300"
                          }`}
                        >
                          <span
                            className={`inline-block size-5 transform rounded-full bg-white shadow-xs transition-transform ${
                              status === "online" ? "translate-x-5" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                        <div>
                          <p className="text-[13px] font-bold text-zinc-950">Temporary Store Closure</p>
                          <p className="text-[11px] text-zinc-500">Hide store from customer checkout temporarily</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={status === "offline" || status === "temporarily_closed" || status === "vacation"}
                          onClick={async () => {
                            const isClosed = status === "offline" || status === "temporarily_closed" || status === "vacation";
                            const next = isClosed ? "online" : "temporarily_closed";
                            await setStatus(next);
                            toast.success(isClosed ? "Store reopened!" : "Store marked temporarily closed");
                          }}
                          className={`relative inline-flex h-6.5 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                            status === "offline" || status === "temporarily_closed" || status === "vacation"
                              ? "bg-emerald-500"
                              : "bg-zinc-300"
                          }`}
                        >
                          <span
                            className={`inline-block size-5 transform rounded-full bg-white shadow-xs transition-transform ${
                              status === "offline" || status === "temporarily_closed" || status === "vacation"
                                ? "translate-x-5"
                                : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ==================== TAB 3: COVERAGE & PINS ==================== */}
                {activeTab === "coverage" && (
                  <form onSubmit={handleSaveCoverage} className="rounded-3xl border border-zinc-200/80 bg-white p-4 sm:p-5 space-y-4 shadow-2xs">
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs font-bold text-zinc-950 mb-1.5">
                          <span>Pickup Radius</span>
                          <span className="font-mono">{coverageDraft.pickupRadiusKm}.0 km</span>
                        </div>
                        <input
                          type="range"
                          min={2}
                          max={20}
                          step={1}
                          value={coverageDraft.pickupRadiusKm}
                          onChange={(e) =>
                            setCoverageDraft((c) => ({ ...c, pickupRadiusKm: Number(e.target.value) }))
                          }
                          className="w-full accent-zinc-950 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-bold text-zinc-950 mb-1.5">
                          <span>Delivery SLA Radius</span>
                          <span className="font-mono">{coverageDraft.deliveryRadiusKm}.0 km</span>
                        </div>
                        <input
                          type="range"
                          min={2}
                          max={25}
                          step={1}
                          value={coverageDraft.deliveryRadiusKm}
                          onChange={(e) =>
                            setCoverageDraft((c) => ({ ...c, deliveryRadiusKm: Number(e.target.value) }))
                          }
                          className="w-full accent-zinc-950 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Operating City</label>
                        <input
                          type="text"
                          value={coverageDraft.city}
                          onChange={(e) => setCoverageDraft((c) => ({ ...c, city: e.target.value }))}
                          placeholder="e.g. Kasganj"
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-medium text-zinc-950 focus:bg-white focus:border-zinc-950 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Locality / Area</label>
                        <input
                          type="text"
                          value={coverageDraft.area}
                          onChange={(e) => setCoverageDraft((c) => ({ ...c, area: e.target.value }))}
                          placeholder="Area or street landmark"
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-medium text-zinc-950 focus:bg-white focus:border-zinc-950 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-600 mb-1.5">
                        Service Pincodes
                      </label>
                      <div className="flex gap-2 mb-2.5">
                        <input
                          type="text"
                          maxLength={6}
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddPin();
                            }
                          }}
                          placeholder="Enter 6-digit PIN"
                          className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-mono font-semibold text-zinc-950 focus:bg-white focus:border-zinc-950 outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddPin}
                          className="inline-flex items-center gap-1 rounded-xl bg-zinc-950 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 cursor-pointer shrink-0"
                        >
                          <Plus className="size-3.5" />
                          Add
                        </button>
                      </div>

                      {coverageDraft.servicePincodes.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {coverageDraft.servicePincodes.map((pin) => (
                            <span
                              key={pin}
                              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 font-mono text-xs font-semibold text-zinc-900"
                            >
                              {pin}
                              <button
                                type="button"
                                onClick={() =>
                                  setCoverageDraft((c) => ({
                                    ...c,
                                    servicePincodes: c.servicePincodes.filter((p) => p !== pin),
                                  }))
                                }
                                className="text-zinc-500 hover:text-zinc-950 cursor-pointer"
                                aria-label={`Remove ${pin}`}
                              >
                                <X className="size-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-zinc-400">No service pincodes added yet.</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={savingCoverage}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-950 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 cursor-pointer"
                    >
                      {savingCoverage && <Loader2 className="size-3.5 animate-spin" />}
                      Save Coverage Area
                    </button>
                  </form>
                )}

                {/* ==================== TAB 4: GALLERY PHOTOS ==================== */}
                {activeTab === "photos" && (
                  <div className="rounded-3xl border border-zinc-200/80 bg-white p-4 sm:p-5 space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-zinc-950">Store &amp; Machinery Photos</h3>
                        <p className="text-[11px] text-zinc-500">
                          {gallery.length} of {galleryLimit} photos uploaded
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {gallery.map((img, idx) => (
                        <div
                          key={img.id}
                          className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100"
                        >
                          {img.url ? (
                            <img
                              src={img.url}
                              alt={img.title || `Store photo ${idx + 1}`}
                              onClick={() => setPreviewPhoto(img.url || null)}
                              className="size-full object-cover cursor-pointer"
                            />
                          ) : (
                            <div className="flex size-full items-center justify-center text-zinc-400">
                              <Store className="size-6" />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeImage(img.url || img.id)}
                            aria-label="Remove photo"
                            className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-zinc-950/75 text-white hover:bg-zinc-950 cursor-pointer"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      ))}

                      {gallery.length < galleryLimit && (
                        <button
                          type="button"
                          onClick={() => galleryInputRef.current?.click()}
                          disabled={uploadingGallery}
                          className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 text-zinc-600 hover:border-zinc-950 hover:text-zinc-950 transition-colors cursor-pointer"
                        >
                          {uploadingGallery ? (
                            <Loader2 className="size-5 animate-spin" />
                          ) : (
                            <ImagePlus className="size-5" />
                          )}
                          <span className="text-[11px] font-semibold">
                            {uploadingGallery ? "Uploading..." : "Add Photo"}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* ==================== TAB 5: CUSTOMER VIEW ==================== */}
                {activeTab === "preview" && (
                  <div className="space-y-3">
                    <div className="text-center">
                      <p className="text-xs font-bold text-zinc-950">Customer App Storefront Preview</p>
                      <p className="text-[11px] text-zinc-500">Live view based on your saved store profile</p>
                    </div>

                    <div className="mx-auto max-w-sm overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
                      <div className="relative h-32 w-full bg-zinc-900 p-3 flex items-start justify-between">
                        {bannerImg && (
                          <img
                            src={bannerImg}
                            alt={profile.name}
                            className="absolute inset-0 size-full object-cover"
                          />
                        )}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-black/25" />
                        <span
                          className={`relative z-10 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold ${statusPillClass}`}
                        >
                          {statusInfo.label}
                        </span>
                        <span className="relative z-10 rounded-full bg-black/55 px-2.5 py-0.5 text-[11px] font-bold text-white backdrop-blur-xs">
                          {profile.rating.toFixed(1)} Rating
                        </span>
                      </div>

                      <div className="p-4 space-y-2.5">
                        <div>
                          <h3 className="text-base font-extrabold text-zinc-950">
                            {profile.name || "Merchant Store"}
                          </h3>
                          <p className="text-[11.5px] text-zinc-500">
                            {profile.category || "Laundry & Dry Clean"}
                            {profile.city ? ` · ${profile.city}` : ""}
                          </p>
                        </div>

                        {profile.description && (
                          <p className="text-xs leading-relaxed text-zinc-600">{profile.description}</p>
                        )}

                        <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] font-semibold">
                          <span className="rounded-lg bg-zinc-100 px-2.5 py-1 text-zinc-800">
                            {formatTimeLabel(hours.openingTime)} – {formatTimeLabel(hours.closingTime)}
                          </span>
                          <span className="rounded-lg bg-zinc-100 px-2.5 py-1 text-zinc-800">
                            Within {area.pickupRadiusKm || 8} km
                          </span>
                          <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-700">
                            {activeServicesCount} Services
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}
          </PullToRefresh>
        </div>
      </div>

      {/* Status Sheet */}
      {statusOpen && (
        <ShopStatusSheet
          open={statusOpen}
          status={status}
          onClose={() => setStatusOpen(false)}
          onSelect={async (next) => {
            await setStatus(next);
            setStatusOpen(false);
            setSuccess(`Status changed to ${shopStatusMeta(next).label}`);
          }}
        />
      )}

      {/* Gallery Image Lightbox */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/85 p-4 backdrop-blur-xs"
        >
          <div className="relative max-w-lg w-full">
            <button
              type="button"
              onClick={() => setPreviewPhoto(null)}
              className="absolute -top-10 right-0 flex size-8 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 cursor-pointer"
            >
              <X className="size-4" />
            </button>
            <img
              src={previewPhoto}
              alt="Store gallery preview"
              className="max-h-[80vh] w-full rounded-2xl object-contain"
            />
          </div>
        </div>
      )}

      <ShopSuccessOverlay message={success} onDone={() => setSuccess(null)} />
      <Toaster />
    </PartnerLayout>
  );
}

export function ShopManagementScreen() {
  return (
    <PartnerShopProvider>
      <ShopManagementContent />
    </PartnerShopProvider>
  );
}
