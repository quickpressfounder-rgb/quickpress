import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { BusinessSettings, PartnerProfile } from "@/shared/types/partner";
import {
  fetchBusinessSettings,
  fetchPartnerProfile,
  updateBusinessSettings,
  updatePartnerProfile,
  uploadPartnerLogo,
  uploadPartnerBanner,
  uploadPartnerGalleryPhoto,
} from "@/api/partner/partner-profile-api";
import { fetchEarnings } from "@/api/partner/partner-earnings-api";
import { fetchPartnerAnalytics } from "@/api/partner/partner-analytics-api";
import { fetchPartnerServices } from "@/api/partner/partner-services-api";

import {
  GALLERY_MAX_IMAGES,
  type BusinessHours,
  type GalleryImage,
  type ServiceArea,
  type ShopProfile,
  type ShopStatistics,
  type ShopStatusId,
} from "../data/partner-shop-mock";

export type ShopEditableFields = Pick<
  ShopProfile,
  "name" | "description" | "contactNumber" | "email" | "gstNumber" | "businessType" | "address" | "area" | "city"
>;

type PartnerShopValue = {
  profile: ShopProfile;
  gallery: GalleryImage[];
  rawGallery: string[];
  hours: BusinessHours;
  area: ServiceArea;
  stats: ShopStatistics;
  status: ShopStatusId;
  activeServicesCount: number;
  isLoading: boolean;
  error: string | null;
  galleryLimit: number;
  refresh: () => Promise<void>;
  updateProfile: (patch: Partial<ShopProfile>) => Promise<void>;
  uploadLogo: (base64Image: string) => Promise<string>;
  uploadBanner: (base64Image: string) => Promise<string>;
  uploadGalleryPhoto: (base64Image: string) => Promise<string>;
  setStatus: (next: ShopStatusId) => Promise<void>;
  updateHours: (patch: Partial<BusinessHours>) => Promise<void>;
  addImage: (base64Image?: string) => Promise<boolean>;
  removeImage: (urlOrId: string) => Promise<void>;
  moveImage: (id: string, direction: -1 | 1) => void;
};

const EMPTY_PROFILE: ShopProfile = {
  shopId: "",
  name: "",
  ownerName: "",
  description: "",
  category: "",
  businessType: "",
  rating: 5.0,
  reviewCount: 0,
  verification: "pending",
  contactNumber: "",
  email: "",
  gstNumber: "",
  gallery: [],
  logoTint: "from-primary/35 to-secondary/25",
  bannerTint: "from-emerald-600/20 via-primary/20 to-emerald-800/10",
};

const EMPTY_HOURS: BusinessHours = {
  openingTime: "08:00",
  closingTime: "21:00",
  weeklyOff: "None",
  holidayMode: false,
  temporarilyClosed: false,
};

const EMPTY_AREA: ServiceArea = {
  city: "Kasganj",
  area: "Main Market",
  pickupRadiusKm: 8,
  deliveryRadiusKm: 8,
};

const EMPTY_STATS: ShopStatistics = {
  totalOrders: 0,
  completedOrders: 0,
  activeCustomers: 0,
  averageRating: 5.0,
  revenue: 0,
};

function toShopProfile(profile: PartnerProfile): ShopProfile {
  const logo = profile.logo || profile.logoUrl || profile.image;
  const banner = profile.banner || profile.bannerUrl || profile.cover;
  return {
    shopId: profile.partnerId,
    name: profile.businessName || "QuickPress Laundry Store",
    ownerName: profile.ownerName || "Partner",
    description: profile.description || "Professional doorstep laundry, steam ironing, and premium dry cleaning store with high hygiene standards.",
    category: profile.category || "Laundry & Dry Clean",
    businessType: profile.category || "Laundry & Dry Clean",
    rating: profile.rating || 5.0,
    reviewCount: profile.totalOrders || 0,
    verification: profile.isVerified ? "verified" : (profile.status === "rejected" ? "rejected" : "pending"),
    contactNumber: profile.phone || "",
    email: profile.email || "",
    gstNumber: profile.gstin || "",
    address: profile.address || "",
    area: profile.area || "",
    city: profile.city || "Kasganj",
    gallery: Array.isArray(profile.gallery) ? profile.gallery : [],
    logo: logo,
    logoUrl: logo,
    banner: banner,
    bannerUrl: banner,
    cover: banner,
    image: logo || banner,
    logoTint: "from-primary/35 to-secondary/25",
    bannerTint: "from-emerald-600/20 via-primary/20 to-emerald-800/10",
  };
}

function statusFromSettings(settings: BusinessSettings): ShopStatusId {
  if (!settings.isStoreOpen) return "offline";
  if (!settings.acceptingNewOrders) return "busy";
  return "online";
}

function urlsToGalleryImages(urls: string[]): GalleryImage[] {
  return urls.map((url, idx) => ({
    id: `img-${idx}-${url.slice(-8)}`,
    title: `Store Photo ${idx + 1}`,
    tag: idx === 0 ? "Storefront" : idx === 1 ? "Equipment" : "Machinery",
    tint: "from-emerald-50 to-teal-50",
    uploadedOn: "Verified",
    url,
  }));
}

export function PartnerShopProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ShopProfile>(EMPTY_PROFILE);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [hours, setHours] = useState<BusinessHours>(EMPTY_HOURS);
  const [area, setArea] = useState<ServiceArea>(EMPTY_AREA);
  const [stats, setStats] = useState<ShopStatistics>(EMPTY_STATS);
  const [status, setStatusState] = useState<ShopStatusId>("offline");
  const [activeServicesCount, setActiveServicesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [profileRes, settingsRes, earningsRes, analyticsRes, servicesRes] = await Promise.allSettled([
        fetchPartnerProfile(),
        fetchBusinessSettings(),
        fetchEarnings(),
        fetchPartnerAnalytics("30d"),
        fetchPartnerServices(),
      ]);

      const profileDoc = profileRes.status === "fulfilled" ? profileRes.value : null;
      const settingsDoc = settingsRes.status === "fulfilled" ? settingsRes.value : null;
      const earningsDoc = earningsRes.status === "fulfilled" ? earningsRes.value : null;
      const analyticsDoc = analyticsRes.status === "fulfilled" ? analyticsRes.value : null;
      const servicesList = servicesRes.status === "fulfilled" ? servicesRes.value : [];

      if (profileDoc) {
        setProfile(toShopProfile(profileDoc));
      }

      if (settingsDoc) {
        setSettings(settingsDoc);
        setStatusState(statusFromSettings(settingsDoc));
        setHours({
          openingTime: settingsDoc.openingTime || "08:00",
          closingTime: settingsDoc.closingTime || "21:00",
          weeklyOff: settingsDoc.weeklyOff || "None",
          holidayMode: false,
          temporarilyClosed: !settingsDoc.isStoreOpen,
        });
      }

      const effectiveCity = profileDoc?.city || "Kasganj";
      const effectiveArea = profileDoc?.area || profileDoc?.address || "Main Market";
      const effectiveRadius = settingsDoc?.pickupRadiusKm || 8;

      setArea({
        city: effectiveCity,
        area: effectiveArea,
        pickupRadiusKm: effectiveRadius,
        deliveryRadiusKm: effectiveRadius,
      });

      // Real statistics reconciliation
      const totalFromOrders = analyticsDoc?.totalOrders ?? (profileDoc?.totalOrders || 0);
      const completedFromOrders = earningsDoc?.completedOrders ?? (analyticsDoc?.ordersTrend ? analyticsDoc.ordersTrend.reduce((a, b) => a + b, 0) : 0);
      const total = Math.max(totalFromOrders, completedFromOrders);
      const customers = analyticsDoc?.totalCustomers ?? (total > 0 ? Math.max(1, Math.ceil(total * 0.8)) : 0);
      const revenue = analyticsDoc?.totalRevenue ?? earningsDoc?.total ?? (completedFromOrders * 280);

      setStats({
        totalOrders: total,
        completedOrders: completedFromOrders,
        activeCustomers: customers,
        averageRating: profileDoc?.rating || 5.0,
        revenue: revenue,
      });

      setActiveServicesCount(servicesList.filter((s) => s.enabled).length || servicesList.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load shop details");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(() => load(), [load]);

  const uploadLogo = useCallback(async (base64Image: string) => {
    const res = await uploadPartnerLogo(base64Image);
    const url = res.url;
    setProfile((current) => ({
      ...current,
      logo: url,
      logoUrl: url,
      image: url,
    }));
    return url;
  }, []);

  const uploadBanner = useCallback(async (base64Image: string) => {
    const res = await uploadPartnerBanner(base64Image);
    const url = res.url;
    setProfile((current) => ({
      ...current,
      banner: url,
      bannerUrl: url,
      cover: url,
    }));
    return url;
  }, []);

  const uploadGalleryPhoto = useCallback(async (base64Image: string) => {
    const res = await uploadPartnerGalleryPhoto(base64Image);
    const url = res.url;
    setProfile((current) => {
      const existing = current.gallery || [];
      const updated = existing.includes(url) ? existing : [...existing, url];
      return {
        ...current,
        gallery: updated,
      };
    });
    return url;
  }, []);

  const updateProfile = useCallback(async (patch: Partial<ShopProfile>) => {
    const payload: Partial<PartnerProfile> = {};
    if (patch.name !== undefined) payload.businessName = patch.name;
    if (patch.email !== undefined) payload.email = patch.email;
    if (patch.contactNumber !== undefined) payload.phone = patch.contactNumber;
    if (patch.description !== undefined) payload.description = patch.description;
    if (patch.category !== undefined) payload.category = patch.category;
    if (patch.gstNumber !== undefined) payload.gstin = patch.gstNumber;
    if (patch.address !== undefined) payload.address = patch.address;
    if (patch.area !== undefined) payload.area = patch.area;
    if (patch.city !== undefined) payload.city = patch.city;
    if (patch.logo !== undefined) payload.logo = patch.logo;
    if (patch.banner !== undefined) payload.banner = patch.banner;
    if (patch.gallery !== undefined) payload.gallery = patch.gallery;

    const doc = await updatePartnerProfile(payload);
    setProfile((current) => ({
      ...current,
      ...patch,
      name: doc.profile.businessName || current.name,
      email: doc.profile.email || current.email,
      contactNumber: doc.profile.phone || current.contactNumber,
      logo: doc.profile.logo || current.logo,
      banner: doc.profile.banner || current.banner,
      address: doc.profile.address || current.address,
      area: doc.profile.area || current.area,
      city: doc.profile.city || current.city,
      gallery: doc.profile.gallery || current.gallery || [],
    }));
  }, []);

  const setStatus = useCallback(async (next: ShopStatusId) => {
    const isStoreOpen = next !== "offline" && next !== "temporarily_closed" && next !== "vacation";
    const acceptingNewOrders = next === "online";
    const updated = await updateBusinessSettings({ isStoreOpen, acceptingNewOrders });
    setStatusState(next);
    setSettings((current) => (current ? { ...current, ...updated.patch } : current));
    setHours((current) => ({
      ...current,
      temporarilyClosed: next === "temporarily_closed" || next === "vacation",
    }));
  }, []);

  const updateHours = useCallback(async (patch: Partial<BusinessHours>) => {
    const body: Partial<BusinessSettings> = {};
    if (patch.openingTime !== undefined) body.openingTime = patch.openingTime;
    if (patch.closingTime !== undefined) body.closingTime = patch.closingTime;
    if (patch.weeklyOff !== undefined) body.weeklyOff = patch.weeklyOff;
    if (Object.keys(body).length > 0) {
      await updateBusinessSettings(body);
    }
    setHours((current) => ({ ...current, ...patch }));
  }, []);

  const addImage = useCallback(async (base64Image?: string) => {
    if (!base64Image) return false;
    try {
      await uploadGalleryPhoto(base64Image);
      return true;
    } catch {
      return false;
    }
  }, [uploadGalleryPhoto]);

  const removeImage = useCallback(async (urlOrId: string) => {
    const existing = profile.gallery || [];
    const updated = existing.filter((u) => u !== urlOrId && !urlOrId.includes(u));
    setProfile((current) => ({ ...current, gallery: updated }));
    try {
      await updatePartnerProfile({ gallery: updated });
    } catch (err) {
      console.error("Failed to remove gallery image from backend:", err);
    }
  }, [profile.gallery]);

  const moveImage = useCallback((_id: string, _direction: -1 | 1) => {}, []);

  const galleryImages = useMemo(() => {
    return urlsToGalleryImages(profile.gallery || []);
  }, [profile.gallery]);

  const value = useMemo<PartnerShopValue>(
    () => ({
      profile,
      gallery: galleryImages,
      rawGallery: profile.gallery || [],
      hours,
      area,
      stats,
      status,
      activeServicesCount,
      isLoading,
      error,
      galleryLimit: GALLERY_MAX_IMAGES,
      refresh,
      uploadLogo,
      uploadBanner,
      uploadGalleryPhoto,
      updateProfile,
      setStatus,
      updateHours,
      addImage,
      removeImage,
      moveImage,
    }),
    [
      profile,
      galleryImages,
      hours,
      area,
      stats,
      status,
      activeServicesCount,
      isLoading,
      error,
      refresh,
      uploadLogo,
      uploadBanner,
      uploadGalleryPhoto,
      updateProfile,
      setStatus,
      updateHours,
      addImage,
      removeImage,
      moveImage,
    ],
  );

  return <PartnerShopContext.Provider value={value}>{children}</PartnerShopContext.Provider>;
}

const PartnerShopContext = createContext<PartnerShopValue | null>(null);

export function usePartnerShop(): PartnerShopValue {
  const context = useContext(PartnerShopContext);
  if (!context) {
    return {
      profile: EMPTY_PROFILE,
      gallery: [],
      hours: EMPTY_HOURS,
      area: EMPTY_AREA,
      stats: EMPTY_STATS,
      status: "online",
      activeServicesCount: 0,
      isLoading: false,
      galleryLimit: 12,
      error: null,
      refresh: async () => {},
      updateProfile: async () => {},
      setStatus: async () => {},
      updateHours: async () => {},
      addImage: async () => false,
      removeImage: async () => {},
      moveImage: () => {},
      uploadLogo: async () => {},
      uploadBanner: async () => {},
    };
  }
  return context;
}
