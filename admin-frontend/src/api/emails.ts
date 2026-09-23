/**
 * QuickPress Email Hub & Surveillance Console API Client
 */

import { apiGetJson, apiPostJson, apiPutJson, apiDeleteJson } from "./core/transport";

export type EmailLog = {
  id: string;
  _id?: string;
  recipient: string;
  recipientName: string;
  cc?: string[] | string;
  audience: "customer" | "partner" | "rider" | "admin" | string;
  category: "order" | "finance" | "onboarding" | "security" | "alert" | "manual" | string;
  subject: string;
  htmlBody: string;
  plainText?: string;
  status: "sent" | "failed" | string;
  method: "smtp" | "resend" | string;
  sender: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  isReply?: boolean;
  replyToId?: string;
  hasAttachment?: boolean;
  attachmentName?: string;
  opened?: boolean;
  openCount?: number;
  firstOpenedAt?: string;
  lastOpenedAt?: string;
  clicked?: boolean;
  clickCount?: number;
  lastClickedAt?: string;
  clicks?: Array<{ url: string; timestamp?: string; clickedAt?: string; ip?: string; userAgent?: string }>;
  createdAt: string;
};

export type EmailStats = {
  total: number;
  sent: number;
  failed: number;
  todaySent: number;
  successRate: number;
  totalOpens: number;
  openRate: number;
  totalClicks: number;
  clickRate: number;
  senderEmail?: string;
  byAudience: {
    customer: number;
    partner: number;
    rider: number;
    admin: number;
  };
  byCategory: {
    order: number;
    finance: number;
    onboarding: number;
    security: number;
    alert: number;
    manual: number;
  };
  gateway?: string;
  senderEmail?: string;
  rateLimits?: {
    activeBuckets: Array<{
      key: string;
      action: string;
      count: number;
      maxAllowed: number;
      remainingSec: number;
    }>;
    totalTracked: number;
    storage: string;
    enforced: boolean;
  };
};

export type EmailTemplate = {
  id: string;
  name: string;
  audience: string;
  category: string;
  badgeLabel: string;
  headline: string;
  subheadline: string;
  subject: string;
  couponCode?: string;
  primaryColor?: string;
  accentColor?: string;
  footerNote?: string;
  bodyContent?: string;
  isCustomized?: boolean;
  updatedAt?: string;
};

export type EmailCampaign = {
  id: string;
  title: string;
  audience: string;
  subject: string;
  message: string;
  couponCode?: string;
  status: "queued" | "sending" | "completed" | "failed" | string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  openCount: number;
  clickCount: number;
  createdAt: string;
  completedAt?: string;
};

export type EmailFilters = {
  audience?: string;
  category?: string;
  status?: string;
  search?: string;
};

export async function fetchEmails(filters?: EmailFilters): Promise<EmailLog[]> {
  try {
    const params: Record<string, string> = {};
    const aud = filters ? filters["audience"] : undefined;
    const cat = filters ? filters["category"] : undefined;
    const st = filters ? filters["status"] : undefined;
    const search = filters ? filters["search"] : undefined;

    if (aud && aud !== "all") params["audience"] = aud;
    if (cat && cat !== "all") params["category"] = cat;
    if (st && st !== "all") params["status"] = st;
    if (search?.trim()) params["search"] = search.trim();

    const data = await apiGetJson<{ items: EmailLog[]; count: number }>("/api/admin/emails", {
      params,
    });
    return data?.items || [];
  } catch (error) {
    console.error("fetchEmails error:", error);
    return [];
  }
}

export async function fetchEmailStats(): Promise<EmailStats> {
  try {
    return await apiGetJson<EmailStats>("/api/admin/emails/stats");
  } catch (error) {
    console.error("fetchEmailStats error:", error);
    return {
      total: 0,
      sent: 0,
      failed: 0,
      todaySent: 0,
      successRate: 100,
      totalOpens: 0,
      openRate: 0,
      totalClicks: 0,
      clickRate: 0,
      byAudience: { customer: 0, partner: 0, rider: 0, admin: 0 },
      byCategory: { order: 0, finance: 0, onboarding: 0, security: 0, alert: 0, manual: 0 },
    };
  }
}

export async function fetchEmailDetail(emailId: string): Promise<EmailLog | null> {
  try {
    return await apiGetJson<EmailLog>(`/api/admin/emails/${emailId}`);
  } catch (error) {
    console.error(`fetchEmailDetail error for ${emailId}:`, error);
    return null;
  }
}

export async function fetchEmailThread(emailId: string): Promise<EmailLog[]> {
  try {
    const res = await apiGetJson<{ items: EmailLog[]; count: number }>(`/api/admin/emails/${emailId}/thread`);
    return res?.items || [];
  } catch (error) {
    console.error(`fetchEmailThread error for ${emailId}:`, error);
    return [];
  }
}

export async function sendCustomEmail(payload: {
  to: string;
  recipient_name?: string | undefined;
  cc?: string | undefined;
  subject: string;
  message: string;
  audience: string;
  category: string;
}): Promise<{ ok: boolean; emailId?: string; error?: string }> {
  return await apiPostJson<{ ok: boolean; emailId?: string; error?: string }>(
    "/api/admin/emails/send",
    payload
  );
}

export async function replyToEmail(
  emailId: string,
  payload: { message: string; subject?: string | undefined; cc?: string | undefined }
): Promise<{ ok: boolean; emailId?: string; error?: string }> {
  return await apiPostJson<{ ok: boolean; emailId?: string; error?: string }>(
    `/api/admin/emails/${emailId}/reply`,
    payload
  );
}

export async function resendEmail(emailId: string): Promise<{ ok: boolean; error?: string }> {
  return await apiPostJson<{ ok: boolean; error?: string }>(
    `/api/admin/emails/${emailId}/resend`,
    {}
  );
}

export async function deleteEmail(emailId: string): Promise<{ ok: boolean; emailId?: string; error?: string }> {
  return await apiDeleteJson<{ ok: boolean; emailId?: string; error?: string }>(`/api/admin/emails/${emailId}`);
}

// ============================================================================
// TEMPLATE STUDIO API
// ============================================================================
export async function fetchTemplates(): Promise<EmailTemplate[]> {
  try {
    const res = await apiGetJson<{ items: EmailTemplate[]; count: number }>("/api/admin/emails/templates");
    return res?.items || [];
  } catch (error) {
    console.error("fetchTemplates error:", error);
    return [];
  }
}

export async function updateTemplate(
  templateId: string,
  payload: Partial<EmailTemplate>
): Promise<{ ok: boolean; template?: EmailTemplate; error?: string }> {
  return await apiPutJson<{ ok: boolean; template?: EmailTemplate; error?: string }>(
    `/api/admin/emails/templates/${templateId}`,
    payload
  );
}

export async function previewTemplate(
  templateId: string,
  payload?: Partial<EmailTemplate>
): Promise<{ ok: boolean; html: string; subject: string }> {
  return await apiPostJson<{ ok: boolean; html: string; subject: string }>(
    `/api/admin/emails/templates/${templateId}/preview`,
    payload || {}
  );
}

export async function resetTemplate(
  templateId: string
): Promise<{ ok: boolean; template?: EmailTemplate }> {
  return await apiPostJson<{ ok: boolean; template?: EmailTemplate }>(
    `/api/admin/emails/templates/${templateId}/reset`,
    {}
  );
}

// ============================================================================
// BULK MARKETING CAMPAIGNS API
// ============================================================================
export async function fetchCampaigns(): Promise<EmailCampaign[]> {
  try {
    const res = await apiGetJson<{ items: EmailCampaign[]; count: number }>("/api/admin/emails/campaigns");
    return res?.items || [];
  } catch (error) {
    console.error("fetchCampaigns error:", error);
    return [];
  }
}

export async function createCampaign(payload: {
  title: string;
  audience: string;
  subject: string;
  message: string;
  couponCode?: string | undefined;
}): Promise<{ ok: boolean; campaignId: string; totalRecipients: number; message: string }> {
  return await apiPostJson<{ ok: boolean; campaignId: string; totalRecipients: number; message: string }>(
    "/api/admin/emails/campaigns",
    payload
  );
}

