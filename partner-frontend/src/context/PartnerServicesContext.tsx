import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { PartnerServiceRate } from "@/shared/types/partner";
import {
  createPartnerService,
  deletePartnerService,
  fetchPartnerServices,
  toggleService as toggleServiceApi,
  updatePartnerService,
} from "@/api/partner/partner-services-api";

import {
  MOST_ORDERED_THRESHOLD,
  categoryLabel,
  type ManagedService,
  type ServiceCategoryId,
  type ServiceIconKey,
  type ServiceOffer,
} from "../data/partner-services-mock";

/* ------------------------------------------------------------------ */
/* Filter / sort vocabulary                                            */
/* ------------------------------------------------------------------ */

export type ServiceFilterId = "active" | "inactive" | "most_ordered" | "high_price" | "low_price";

export const SERVICE_FILTERS: { id: ServiceFilterId; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
  { id: "most_ordered", label: "Most Ordered" },
  { id: "high_price", label: "Highest Price" },
  { id: "low_price", label: "Lowest Price" },
];

export type ServiceSortId = "name" | "price" | "popularity" | "recent";

export const SERVICE_SORTS: { id: ServiceSortId; label: string }[] = [
  { id: "name", label: "Name" },
  { id: "price", label: "Price" },
  { id: "popularity", label: "Popularity" },
  { id: "recent", label: "Recently Updated" },
];

const HIGH_PRICE_THRESHOLD = 200;
const LOW_PRICE_THRESHOLD = 100;

export function matchesServiceFilter(service: ManagedService, filter: ServiceFilterId) {
  switch (filter) {
    case "active":
      return service.enabled;
    case "inactive":
      return !service.enabled;
    case "most_ordered":
      return service.ordersThisMonth >= MOST_ORDERED_THRESHOLD;
    case "high_price":
      return service.price >= HIGH_PRICE_THRESHOLD;
    case "low_price":
      return service.price <= LOW_PRICE_THRESHOLD;
    default:
      return true;
  }
}

export function matchesServiceQuery(service: ManagedService, rawQuery: string) {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  return (
    service.name.toLowerCase().includes(q) ||
    categoryLabel(service.category).toLowerCase().includes(q) ||
    service.category.toLowerCase().includes(q)
  );
}

export function sortServices(list: ManagedService[], sort: ServiceSortId) {
  const copy = [...list];
  switch (sort) {
    case "price":
      return copy.sort((a, b) => b.price - a.price);
    case "popularity":
      return copy.sort((a, b) => b.ordersThisMonth - a.ordersThisMonth);
    case "recent":
      return copy.sort((a, b) => a.updatedMinutesAgo - b.updatedMinutesAgo);
    case "name":
    default:
      return copy.sort((a, b) => a.name.localeCompare(b.name));
  }
}

/* ------------------------------------------------------------------ */
/* Backend → view-model adapter                                        */
/* ------------------------------------------------------------------ */

const CATEGORY_TO_UI: Record<string, ServiceCategoryId> = {
  laundry: "wash",
  wash: "wash",
  "dry-clean": "dry-clean",
  iron: "iron",
  premium: "premium",
  "shoe-care": "shoe-care",
  "home-care": "home-care",
};

const UI_CATEGORY_TO_BACKEND: Record<ServiceCategoryId, string> = {
  wash: "laundry",
  "dry-clean": "dry-clean",
  iron: "iron",
  premium: "premium",
  "shoe-care": "shoe-care",
  "home-care": "home-care",
};

const CATEGORY_TO_ICON: Record<ServiceCategoryId, ServiceIconKey> = {
  wash: "wash",
  "dry-clean": "dryclean",
  iron: "iron",
  premium: "premium",
  "shoe-care": "shoe",
  "home-care": "blanket",
};

function toManagedService(rate: PartnerServiceRate): ManagedService {
  const categoryKey = String(rate.category || "wash").toLowerCase();
  const category = CATEGORY_TO_UI[categoryKey] ?? "wash";
  return {
    id: String(rate.id),
    name: rate.name || "Laundry Service",
    category,
    icon: CATEGORY_TO_ICON[category] ?? "wash",
    description: (rate as any).description ?? "",
    price: Number(rate.price || 0),
    unit: (["kg", "piece", "pair", "fixed"].includes(rate.unit) ? rate.unit : "kg") as ManagedService["unit"],
    estimatedHours: Number(rate.turnaroundHours || 24),
    minOrderValue: (rate as any).minQuantity ? Number((rate as any).minQuantity) * Number(rate.price) : 0,
    enabled: rate.enabled !== false,
    ordersThisMonth: 0,
    updatedMinutesAgo: 0,
    imageLabel: rate.image || (rate as any).image || null,
    pendingApproval: Boolean(rate.pendingApproval),
    approvalStatus: rate.approvalStatus || (rate.pendingApproval ? "pending" : "approved"),
    rejectionReason: rate.rejectionReason,
    pendingChanges: rate.pendingChanges,
  };
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

export type ServiceDraft = Omit<ManagedService, "id" | "ordersThisMonth" | "updatedMinutesAgo">;

type ServicesContextValue = {
  services: ManagedService[];
  offers: ServiceOffer[];
  isLoading: boolean;
  isOffline: boolean;
  error: string | null;
  activeCount: number;
  refresh: () => Promise<void>;
  toggleOffline: () => void;
  getService: (id: string) => ManagedService | undefined;
  offersFor: (id: string) => ServiceOffer[];
  toggleService: (id: string) => Promise<void>;
  addService: (draft: ServiceDraft) => Promise<ManagedService>;
  updateService: (id: string, patch: Partial<ServiceDraft>) => Promise<void>;
  removeService: (id: string) => Promise<void>;
  addOffer: (offer: Omit<ServiceOffer, "id">) => void;
  removeOffer: (id: string) => void;
};

const ServicesContext = createContext<ServicesContextValue | null>(null);

const CACHED_SERVICES_KEY = "quickpress:partner:cached_services";

function readCachedServices(): ManagedService[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CACHED_SERVICES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCachedServices(list: ManagedService[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHED_SERVICES_KEY, JSON.stringify(list));
  } catch {}
}

export function PartnerServicesProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<ManagedService[]>(() => readCachedServices());
  const [offers, setOffers] = useState<ServiceOffer[]>([]);
  const [isLoading, setIsLoading] = useState(() => readCachedServices().length === 0);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (readCachedServices().length === 0) setIsLoading(true);
    setError(null);
    try {
      const items = await fetchPartnerServices();
      const mapped = items.map(toManagedService);
      setServices(mapped);
      writeCachedServices(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load services");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(() => load(), [load]);

  const value = useMemo<ServicesContextValue>(
    () => ({
      services,
      offers,
      isLoading,
      isOffline,
      error,
      activeCount: services.filter((service) => service.enabled).length,
      refresh,
      toggleOffline: () => setIsOffline((prev) => !prev),
      getService: (id) => services.find((service) => service.id === id),
      offersFor: (id) => offers.filter((offer) => offer.serviceId === id),
      toggleService: async (id) => {
        const service = services.find((item) => item.id === id);
        if (!service) return;
        await toggleServiceApi(id, !service.enabled);
        await load();
      },
      addService: async (draft) => {
        const raw = await createPartnerService({
          name: draft.name,
          unit: draft.unit,
          price: draft.price,
          turnaroundHours: draft.estimatedHours,
          enabled: draft.enabled,
          category: UI_CATEGORY_TO_BACKEND[draft.category] || "laundry",
          description: draft.description || "",
          image: draft.imageLabel || "",
          minQuantity: draft.minOrderValue ? Math.max(1, Math.round(draft.minOrderValue / Math.max(1, draft.price))) : 1,
        });
        await load();
        return toManagedService(raw);
      },
      updateService: async (id, patch) => {
        await updatePartnerService(id, {
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.unit !== undefined ? { unit: patch.unit } : {}),
          ...(patch.price !== undefined ? { price: patch.price } : {}),
          ...(patch.estimatedHours !== undefined ? { turnaroundHours: patch.estimatedHours } : {}),
          ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
          ...(patch.category !== undefined ? { category: UI_CATEGORY_TO_BACKEND[patch.category] || "laundry" } : {}),
          ...(patch.description !== undefined ? { description: patch.description } : {}),
          ...(patch.imageLabel !== undefined ? { image: patch.imageLabel || "" } : {}),
        });
        await load();
      },
      removeService: async (id) => {
        await deletePartnerService(id);
        await load();
      },
      addOffer: (offer) =>
        // No offers endpoint exists on the backend yet; offers stay client-side.
        setOffers((prev) => [{ ...offer, id: `ofr-${Date.now()}` }, ...prev]),
      removeOffer: (id) => setOffers((prev) => prev.filter((offer) => offer.id !== id)),
    }),
    [services, offers, isLoading, isOffline, error, refresh, load],
  );

  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

export function usePartnerServices() {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error("usePartnerServices must be used inside PartnerServicesProvider");
  return ctx;
}
