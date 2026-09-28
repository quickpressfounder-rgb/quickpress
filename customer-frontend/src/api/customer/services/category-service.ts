/**
 * Category Service — GET /api/categories
 *
 * Active service categories for the Home grid, ordered by sortOrder.
 */

import { API_ENDPOINTS } from "../api/config";
import { CACHE_KEYS, readCache, readStaleCache, writeCache } from "../api/cache";
import { apiGet, resolveResource } from "../api/http-client";
import type { Category } from "../home-api";

export type { Category };

function normalise(categories: Category[]): Category[] {
  return [...categories]
    .filter((category) => category.status !== "inactive")
    .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "c1", title: "Wash & Fold", description: "Everyday laundry", icon: "washing-machine", image: "/images/services/wash-fold.jpg", sortOrder: 1, status: "active" },
  { id: "c2", title: "Dry Cleaning", description: "Delicate fabrics", icon: "shirt", image: "/images/services/dry-cleaning.jpg", sortOrder: 2, status: "active" },
  { id: "c3", title: "Steam Iron", description: "Crisp finish", icon: "flame", image: "/images/services/steam-iron.jpg", sortOrder: 3, status: "active" },
  { id: "c4", title: "Premium Laundry", description: "Hand finished", icon: "sparkles", image: "/images/services/premium-laundry.jpg", sortOrder: 4, status: "active" },
  { id: "c5", title: "Shoe Cleaning", description: "Deep restore", icon: "footprints", image: "/images/services/shoe-cleaning.jpg", sortOrder: 5, status: "active" },
  { id: "c6", title: "Curtain Cleaning", description: "Home fabrics", icon: "blinds", image: "/images/services/curtain-cleaning.jpg", sortOrder: 6, status: "active" },
  { id: "c7", title: "Blanket Cleaning", description: "Bulky care", icon: "bed-double", image: "/images/services/blanket-cleaning.jpg", sortOrder: 7, status: "active" },
  { id: "c8", title: "Carpet Cleaning", description: "Fibre deep wash", icon: "layout-grid", image: "/images/services/carpet-cleaning.jpg", sortOrder: 8, status: "active" },
  { id: "c9", title: "Bag & Leather Cleaning", description: "Handbags, jackets & leather care", icon: "briefcase", image: "/images/services/bag-leather-cleaning.jpg", sortOrder: 9, status: "active" },
];

export function fetchCategories(options: { forceRefresh?: boolean | undefined; signal?: AbortSignal | undefined } = {}) {
  return resolveResource<Category[]>({
    forceRefresh: options.forceRefresh,
    request: async () => {
      try {
        const res = await apiGet<Category[]>(API_ENDPOINTS.categories, { signal: options.signal });
        if (Array.isArray(res) && res.length > 0) {
          return normalise(res);
        }
      } catch {
        // Fallback to default categories
      }
      return DEFAULT_CATEGORIES;
    },
    readCache: () => readCache<Category[]>(CACHE_KEYS.categories),
    readStaleCache: () => readStaleCache<Category[]>(CACHE_KEYS.categories) || DEFAULT_CATEGORIES,
    writeCache: (value) => writeCache(CACHE_KEYS.categories, value),
  });
}
