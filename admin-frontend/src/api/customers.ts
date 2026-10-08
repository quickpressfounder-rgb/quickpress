/** GET/POST /api/admin/customers/* — live customers from the shared backend. */
import { apiGetJson, apiPostJson } from "@/api/core/transport";

type BackendCustomer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  orders: number;
  spend: number;
  status: string;
};

type BackendCustomerPage = {
  items: BackendCustomer[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminCustomer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  zone: string;
  orders: number;
  completedOrders: number;
  cancelledOrders: number;
  spend: string;
  spendRaw: number;
  wallet: string;
  walletRaw: number;
  loyaltyPoints: number;
  loyaltyLevel: string;
  membership: string;
  joined: string;
  registrationTimestamp: string;
  lastActive: string;
  lastLoginTimestamp: string;
  lastOrder: string;
  lastOrderTimestamp?: string;
  isVip: boolean;
  status: "Active" | "Blocked";
  tags: string[];
  addressCount: number;
  primaryAddress: string;
  deviceInfo: string;
};

function toAdminCustomer(row: any): AdminCustomer {
  const rawStatus = (row.status || "active").toLowerCase();
  const spendNum = typeof row.spend === "number" ? row.spend : (row.spendRaw || 0);
  const walletNum = typeof row.walletBalance === "number" ? row.walletBalance : (row.walletRaw || 0);
  return {
    id: String(row.id || row._id || ""),
    name: row.name || "QuickPress Customer",
    phone: row.phone || "—",
    email: row.email || "—",
    city: row.city || "",
    zone: row.zone || "Operational Zone",
    orders: Number(row.orders || 0),
    completedOrders: Number(row.completedOrders || 0),
    cancelledOrders: Number(row.cancelledOrders || 0),
    spend: `₹${spendNum.toLocaleString("en-IN")}`,
    spendRaw: spendNum,
    wallet: `₹${walletNum.toLocaleString("en-IN")}`,
    walletRaw: walletNum,
    loyaltyPoints: Number(row.loyaltyPoints || 0),
    loyaltyLevel: row.loyaltyLevel || "Silver Tier",
    membership: typeof row.membership === "object" && row.membership !== null ? (row.membership.plan || (row.isVip ? "Gold VIP" : "Standard")) : (row.membership || (row.isVip ? "Gold VIP" : "Standard")),
    joined: row.registrationDate || (row.registrationTimestamp ? String(row.registrationTimestamp).slice(0, 10) : "—"),
    registrationTimestamp: row.registrationTimestamp || row.registrationDate || row.createdAt || row.created_at || row.registered_at || "",
    lastActive: row.lastActive || (row.lastLoginTimestamp ? String(row.lastLoginTimestamp).slice(0, 10) : "—"),
    lastLoginTimestamp: row.lastLoginTimestamp || row.lastActive || row.lastLoginAt || row.last_login_at || row.updatedAt || row.updated_at || row.registrationTimestamp || "",
    lastOrder: row.lastOrder || "—",
    lastOrderTimestamp: row.lastOrderTimestamp,
    isVip: Boolean(row.isVip || spendNum >= 500),
    status: rawStatus === "blocked" ? ("Blocked" as const) : ("Active" as const),
    tags: Array.isArray(row.tags) ? row.tags : (row.city ? ["Customer", row.city] : ["Customer"]),
    addressCount: Number(row.addressCount || (row.addresses ? row.addresses.length : 1)),
    primaryAddress: row.primaryAddress || (row.city ? `${row.city}` : "—"),
    deviceInfo: row.deviceInfo || "Mobile App (Android/iOS)",
  };
}

/** GET /api/admin/customers — pulls every page so console-side search/filter still works. */
export async function fetchCustomers(): Promise<AdminCustomer[]> {
  try {
    const first = await apiGetJson<any>("/api/admin/customers?page=1&pageSize=100");
    let items: any[] = [];
    if (Array.isArray(first)) {
      items = first;
    } else if (first && Array.isArray(first.items)) {
      items = [...first.items];
      const total = typeof first.total === "number" ? first.total : items.length;
      const pageSize = typeof first.pageSize === "number" ? first.pageSize : 100;
      const pages = Math.ceil(total / pageSize);
      for (let page = 2; page <= pages; page += 1) {
        try {
          const next = await apiGetJson<any>(`/api/admin/customers?page=${page}&pageSize=${pageSize}`);
          if (next && Array.isArray(next.items)) {
            items = items.concat(next.items);
          } else if (Array.isArray(next)) {
            items = items.concat(next);
          }
        } catch {
          // ignore page fetch errors
        }
      }
    }
    return items.map(toAdminCustomer);
  } catch (err) {
    console.error("fetchCustomers error:", err);
    return [];
  }
}

export type CustomerStats = {
  totalCustomers: number;
  activeCustomers: number;
  blockedCustomers: number;
  newCustomersToday: number;
  newCustomersThisWeek: number;
  newCustomersThisMonth: number;
  repeatCustomers: number;
  inactiveCustomers: number;
  vipCustomers: number;
  membershipCustomers: number;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
};

export type Customer360Data = {
  profile: AdminCustomer;
  overview: {
    firstOrder: string;
    lastOrder: string;
    firstLoginAt: string;
    lastLoginAt: string;
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    favoriteService: string;
    favoritePartner: string;
    clv: number;
    walletBalance: number;
    loyaltyPoints: number;
    loyaltyLevel: string;
    membership: string;
    referralCode: string;
    referralEarnings: number;
    referredCount: number;
  };
  orders: Array<{
    id: string;
    code?: string;
    service?: string;
    placedOn?: string;
    total?: string;
    amount?: number;
    status: string;
    partner?: string;
    address?: string;
  }>;
  wallet: {
    balance: number;
    totalCashback: number;
    totalRefund: number;
    referralRewards: number;
    ledger: Array<{
      _id?: string;
      id?: string;
      type: string;
      amount: number;
      balanceBefore?: number;
      balanceAfter?: number;
      reason?: string;
      createdAt: string;
      adminId?: string;
    }>;
  };
  loyalty: {
    points: number;
    availablePoints: number;
    level: string;
    nextLevel: string;
    progressPercent: number;
  };
  membership: {
    plan: string;
    startDate: string;
    expiryDate: string;
    status: string;
    benefits: string[];
  };
  addresses: Array<{
    id: string;
    type: string;
    fullAddress: string;
    city: string;
    pincode: string;
    landmark?: string;
    isDefault?: boolean;
  }>;
  support: Array<{
    id: string;
    subject: string;
    status: string;
    createdAt: string;
    priority?: string;
  }>;
  notes: Array<{ id: string; note: string; author: string; at: string }>;
  tags: string[];
  activity: Array<{ date: string; event: string; source: string; icon?: string }>;
  security: {
    status: string;
    registrationDate: string;
    registrationTimestamp: string;
    lastLoginTimestamp: string;
    deviceInfo: string;
    ipAddress: string;
    activeSessions: number;
    loginHistory: Array<{
      device: string;
      ip: string;
      at: string;
      location?: string;
      action?: string;
    }>;
  };
};

/** GET /api/admin/customers/stats */
export async function fetchCustomerStats(): Promise<CustomerStats> {
  try {
    return await apiGetJson<CustomerStats>("/api/admin/customers/stats");
  } catch {
    return {
      totalCustomers: 0,
      activeCustomers: 0,
      blockedCustomers: 0,
      newCustomersToday: 0,
      newCustomersThisWeek: 0,
      newCustomersThisMonth: 0,
      repeatCustomers: 0,
      inactiveCustomers: 0,
      vipCustomers: 0,
      membershipCustomers: 0,
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
    };
  }
}

/** GET /api/admin/customers/{id}/360 */
export async function fetchCustomer360(id: string): Promise<Customer360Data> {
  return await apiGetJson<Customer360Data>(`/api/admin/customers/${id}/360`);
}

/** POST /api/admin/customers/{id}/wallet/adjust */
export async function adjustCustomerWallet(id: string, amount: number, reason: string) {
  return await apiPostJson<{ ok: boolean; newBalance: number }>(`/api/admin/customers/${id}/wallet/adjust`, { amount, reason });
}

/** POST /api/admin/customers/{id}/loyalty/adjust */
export async function adjustCustomerLoyalty(id: string, points: number, reason: string) {
  return await apiPostJson<{ ok: boolean; newPoints: number }>(`/api/admin/customers/${id}/loyalty/adjust`, { points, reason });
}


/** POST /api/admin/customers/{id}/notes */
export async function addCustomerNote(id: string, note: string) {
  return await apiPostJson<{ id: string; note: string; author: string; at: string }>(`/api/admin/customers/${id}/notes`, { note });
}

/** POST /api/admin/customers/{id}/tags */
export async function updateCustomerTags(id: string, tags: string[]) {
  return await apiPostJson<{ ok: boolean; tags: string[] }>(`/api/admin/customers/${id}/tags`, { tags });
}

/** POST /api/admin/customers/{id}/send-notification */
export async function sendCustomerNotification(id: string, title: string, body: string) {
  return await apiPostJson<{ ok: boolean; sent: boolean }>(`/api/admin/customers/${id}/send-notification`, { title, body });
}

/** POST /api/admin/customers/{id}/logout-sessions */
export async function logoutCustomerSessions(id: string) {
  return await apiPostJson<{ ok: boolean; invalidated: boolean }>(`/api/admin/customers/${id}/logout-sessions`, {});
}

/** POST /api/admin/customers/{id}/block or /unblock */
export async function setCustomerBlocked(id: string, blocked: boolean) {
  return await apiPostJson<{ ok: boolean; id: string; blocked: boolean }>(
    `/api/admin/customers/${id}/${blocked ? "block" : "unblock"}`,
  );
}


