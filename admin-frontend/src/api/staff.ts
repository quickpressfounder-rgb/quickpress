/**
 * Staff & Role-Based Access Control (RBAC) & Operations Audit Engine API Client
 *
 * GET/POST /api/admin/staff               — Team members directory & onboarding
 * PUT/DELETE /api/admin/staff/{id}        — Update permissions, territory & status
 * PUT /api/admin/staff/{id}/permissions   — Granular RBAC permission boundaries
 * PUT /api/admin/staff/{id}/status        — Toggle Active/Suspended/Approved status
 * GET /api/admin/staff/roles              — RBAC security tier matrices
 * GET /api/admin/staff/logs               — Complete immutable security audit trail
 */
import { apiGetJson, apiPostJson, apiPutJson, apiDeleteJson } from "@/api/core/transport";

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  scope: string;
  permissions: string[];
  lastActive: string;
  status: "Active" | "Pending Verification" | "Pending Approval" | "Suspended";
  createdAt?: string;
};

export type StaffRole = {
  id: string;
  name: string;
  members: number;
  permissions: string[];
};

export type ActivityLog = {
  id: string;
  actor: string;
  actorId?: string;
  action: string;
  target: string;
  at: string;
  meta?: Record<string, any>;
};

type BackendStaff = {
  _id: string;
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  scope?: string;
  permissions?: string[];
  lastActive?: string;
  status?: string;
  createdAt?: string;
};

function toStaff(row: BackendStaff): StaffMember {
  return {
    id: row._id || row.id || "",
    name: row.name || "Super Admin",
    email: row.email || "admin@quickpress.online",
    phone: row.phone || "+91 98719 62596",
    role: row.role || "Super Admin",
    scope: row.scope || "All India Hubs",
    permissions: row.permissions || [
      "all",
      "orders",
      "customers",
      "partners",
      "riders",
      "services",
      "finance",
      "wallet",
      "cities",
      "coupons",
      "memberships",
      "analytics",
      "notifications",
      "support",
      "staff",
      "settings",
    ],
    lastActive: row.lastActive || "Active now",
    status: (row.status as StaffMember["status"]) || "Active",
    createdAt: (row.createdAt || "").slice(0, 10),
  };
}

export async function fetchStaff(): Promise<StaffMember[]> {
  try {
    const rows = await apiGetJson<BackendStaff[]>("/api/admin/staff");
    return (rows || []).map(toStaff);
  } catch {
    return [];
  }
}

export async function fetchRoles(): Promise<StaffRole[]> {
  try {
    return await apiGetJson<StaffRole[]>("/api/admin/staff/roles");
  } catch {
    return [];
  }
}

export async function fetchActivityLogs(actor?: string, action?: string): Promise<ActivityLog[]> {
  try {
    const params = new URLSearchParams();
    if (actor && actor !== "all") params.set("actor", actor);
    if (action && action !== "all") params.set("action", action);
    const query = params.toString() ? `?${params.toString()}` : "";
    return await apiGetJson<ActivityLog[]>(`/api/admin/staff/logs${query}`);
  } catch {
    return [];
  }
}

export function inviteStaff(payload: Partial<StaffMember> & { password?: string }) {
  return apiPostJson<BackendStaff>("/api/admin/staff", payload);
}

export function updateStaff(id: string, payload: Partial<StaffMember> & { password?: string }) {
  return apiPutJson<BackendStaff>(`/api/admin/staff/${id}`, payload);
}

export function updateStaffPermissions(id: string, permissions: string[]) {
  return apiPutJson<{ ok: boolean; permissions: string[] }>(`/api/admin/staff/${id}/permissions`, {
    permissions,
  });
}

export function updateStaffStatus(id: string, status: string, reason?: string) {
  return apiPutJson<{ ok: boolean; status: string }>(`/api/admin/staff/${id}/status`, {
    status,
    reason,
  });
}

export function deleteStaff(id: string) {
  return apiDeleteJson<{ ok: boolean }>(`/api/admin/staff/${id}`);
}
