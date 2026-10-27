/** Public API client for QuickPress Informational Website & Legal Documentation. */

export interface PublicLegalDoc {
  slug: string;
  title: string;
  currentVersion: string;
  effectiveDate: string;
  summary: string;
  content: string;
  publishedAt?: string;
}

export interface PublicServiceItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  tagline: string;
  icon?: string;
  imageUrl?: string;
  turnaround: string;
  popular?: boolean;
  unit: string;
  features: string[];
}

export interface PublicServiceDetail extends PublicServiceItem {
  careInstructions: string[];
  faqs: Array<{ question: string; answer: string }>;
  suitableItems: string[];
  workflow: Array<{ step: string; title: string; desc: string }>;
}

export interface PublicCity {
  id: string;
  name: string;
  state: string;
  pincodes: string[];
  coverageZones: string[];
  activeHubs: number;
  expressAvailable: boolean;
}

export interface PublicFaq {
  id: string;
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
}

export interface PublicWebsiteSettings {
  brandName: string;
  tagline: string;
  supportPhone: string;
  supportEmail: string;
  registeredOffice: string;
  cin?: string;
  gstin?: string;
  socialLinks: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    linkedin?: string;
  };
}

export interface ContactFormPayload {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(endpoint, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    let errorDetail = "Request failed";
    try {
      const json = await res.json();
      errorDetail = json.detail || json.message || errorDetail;
    } catch {}
    throw new Error(errorDetail);
  }
  return res.json();
}

export async function fetchPublicLegalDoc(slug: string): Promise<PublicLegalDoc> {
  return apiFetch<PublicLegalDoc>(`/api/public/legal/${slug}`);
}

export async function fetchPublicServices(): Promise<PublicServiceItem[]> {
  return apiFetch<PublicServiceItem[]>("/api/public/services");
}

export async function fetchPublicServiceDetail(slug: string): Promise<PublicServiceDetail> {
  return apiFetch<PublicServiceDetail>(`/api/public/services/${slug}`);
}

export async function fetchPublicCities(): Promise<PublicCity[]> {
  return apiFetch<PublicCity[]>("/api/public/cities");
}

export async function fetchPublicFaqs(category?: string): Promise<PublicFaq[]> {
  const url = category ? `/api/public/faqs?category=${encodeURIComponent(category)}` : "/api/public/faqs";
  return apiFetch<PublicFaq[]>(url);
}

export async function fetchPublicWebsiteSettings(): Promise<PublicWebsiteSettings> {
  return apiFetch<PublicWebsiteSettings>("/api/public/settings");
}

export async function submitPublicContact(payload: ContactFormPayload): Promise<{ ok: boolean; id: string; message: string }> {
  return apiFetch("/api/public/contact", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface CompanyLegalProfile {
  brandName?: string;
  tagline?: string;
  legalName?: string;
  cin?: string;
  pan?: string;
  gstin?: string;
  registeredAddress?: string;
  operatingAddress?: string;
  supportEmail?: string;
  corporateEmail?: string;
  legalEmail?: string;
  supportPhone?: string;
  tollFreePhone?: string;
  grievanceOfficerName?: string;
  grievanceOfficerPhone?: string;
  authorizedSignatoryName?: string;
  authorizedSignatoryDesignation?: string;
  websiteUrl?: string;
}

export async function fetchCompanyProfile(): Promise<CompanyLegalProfile> {
  return apiFetch<CompanyLegalProfile>("/api/public/company-profile");
}
