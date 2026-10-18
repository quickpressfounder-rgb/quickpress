import { request } from "./core/admin-client";

export interface AdminStory {
  _id: string;
  id: string;
  title: string;
  tagline: string;
  badge: string;
  badgeBg: string;
  gradient: string;
  icon: string;
  imageUrl?: string;
  points: string[];
  ctaText: string;
  ctaAction: string;
  actionType: "external_link" | "internal_route" | "share" | "google_form";
  audience: "riders" | "customers" | "partners" | "all";
  priority: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminBanner {
  _id: string;
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  theme: string;
  rewardAmount: number;
  ctaText: string;
  ctaLink: string;
  actionType: "reward_scratch" | "external_link" | "google_form" | "internal_route";
  audience: "riders" | "customers" | "partners" | "all";
  priority: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// --------------------------------------------------------------------------
// Stories Endpoints
// --------------------------------------------------------------------------

export async function fetchAdminStories(): Promise<AdminStory[]> {
  try {
    return await request<AdminStory[]>("/promotions/stories");
  } catch {
    // Fallback default stories
    return [];
  }
}

export async function createAdminStory(payload: Omit<AdminStory, "_id" | "id">): Promise<AdminStory> {
  return await request<AdminStory>("/promotions/stories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminStory(
  id: string,
  payload: Partial<AdminStory>
): Promise<AdminStory> {
  return await request<AdminStory>(`/promotions/stories/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminStory(id: string): Promise<{ ok: boolean }> {
  return await request<{ ok: boolean }>(`/promotions/stories/${id}`, {
    method: "DELETE",
  });
}

// --------------------------------------------------------------------------
// Banners Endpoints
// --------------------------------------------------------------------------

export async function fetchAdminBanners(): Promise<AdminBanner[]> {
  try {
    return await request<AdminBanner[]>("/promotions/banners");
  } catch {
    return [];
  }
}

export async function createAdminBanner(payload: Omit<AdminBanner, "_id" | "id">): Promise<AdminBanner> {
  return await request<AdminBanner>("/promotions/banners", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminBanner(
  id: string,
  payload: Partial<AdminBanner>
): Promise<AdminBanner> {
  return await request<AdminBanner>(`/promotions/banners/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminBanner(id: string): Promise<{ ok: boolean }> {
  return await request<{ ok: boolean }>(`/promotions/banners/${id}`, {
    method: "DELETE",
  });
}
