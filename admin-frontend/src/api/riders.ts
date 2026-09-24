/** GET/POST/PUT /api/admin/riders/* — live riders from the shared backend. */
import { apiDeleteJson, apiGetJson, apiPostJson, apiPutJson } from "@/api/core/transport";

export type AdminRider = {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  zone: string;
  vehicle: string;
  plate: string;
  trips: number;
  rating: string;
  wallet: string;
  walletRaw: number;
  codCash: string;
  codCashRaw: number;
  bankName: string;
  accountLast4: string;
  ifsc: string;
  upiId: string;
  joinedOn: string;
  registrationTimestamp: string;
  lastActive: string;
  lastLoginTimestamp: string;
  kyc: "Verified" | "Pending" | "Rejected";
  live: "Online" | "Offline" | "On delivery";
  status: "Active" | "Pending" | "Suspended";
  resubmitted?: boolean;
  resubmittedAt?: string;
  resubmissionCount?: number;
  rejectionReason?: string;
  raw?: any;
};

export type RiderStats = {
  totalFleet: number;
  onlineFleet: number;
  onDelivery: number;
  availableDispatch: number;
  kycVerified: number;
  kycPending: number;
  suspendedFleet: number;
  totalTripsDelivered: number;
  totalEarningsPaid: number;
  fleetUtilization: number;
};

export type Rider360Data = {
  profile: AdminRider;
  personal?: {
    fullName: string;
    phone: string;
    email: string;
    city: string;
    fatherName: string;
    dob: string;
    gender: string;
    address: string;
    pincode: string;
    registeredAt: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
  };
  agreement?: {
    isSigned: boolean;
    signedAt: string;
    signerName: string;
    ipAddress: string;
    deviceInfo: string;
    signatureUrl?: string;
  };
  overview: {
    firstLoginAt: string;
    lastLoginAt: string;
    registrationTimestamp: string;
    totalTrips: number;
    completedDeliveries: number;
    cancelledDeliveries: number;
    onTimeDeliveryRate: number;
    acceptanceRate: number;
    averageRating: number;
    totalKmCovered: number;
    avgDeliveryTimeMins: number;
    assignedHub: string;
    serviceZone: string;
    batteryLevel: number;
  };
  vehicle: {
    vehicleType: string;
    vehicleModel: string;
    vehicleNumber: string;
    drivingLicenseNumber: string;
    rcNumber: string;
    fuelType?: string;
    vehicleColor?: string;
    vehicleYear?: string;
    insuranceExpiry: string;
    pollutionExpiry: string;
  };
  kyc: {
    status: "Verified" | "Pending" | "Rejected";
    verifiedAt: string;
    rejectionReason?: string;
    rejectedDocuments?: string[];
    documents: Array<{
      id: string;
      type: string;
      name: string;
      documentUrl?: string;
      status: "Verified" | "Pending" | "Rejected";
      uploadedAt: string;
      rejectionReason?: string;
    }>;
  };
  trips: Array<{
    id: string;
    orderCode: string;
    service: string;
    partner: string;
    customer: string;
    pickupAddress: string;
    dropAddress: string;
    distanceKm: number;
    earning: number;
    tip: number;
    rating: number;
    status: string;
    placedAt: string;
    deliveredAt: string;
  }>;
  wallet: {
    balance: number;
    codCashInHand: number;
    totalEarnings: number;
    incentiveBonus: number;
    tipsEarned: number;
    ledger: Array<{
      id: string;
      type: string;
      amount: number;
      balanceBefore: number;
      balanceAfter: number;
      reason: string;
      createdAt: string;
    }>;
  };
  payouts: {
    bankName: string;
    accountNumber: string;
    ifsc: string;
    upiId: string;
    beneficiaryName: string;
    payoutHistory: Array<{
      id: string;
      amount: number;
      utrNumber: string;
      bankRef: string;
      status: string;
      processedAt: string;
    }>;
  };
  shifts: Array<{
    date: string;
    loginAt: string;
    logoutAt: string;
    onlineHours: number;
    ordersCompleted: number;
    status: string;
  }>;
  security: {
    status: string;
    registrationTimestamp: string;
    lastLoginTimestamp: string;
    deviceInfo: string;
    appVersion: string;
    ipAddress: string;
    activeSessions: number;
    loginHistory: Array<{
      device: string;
      ip: string;
      at: string;
      location: string;
      action: string;
    }>;
  };
};

function toAdminRider(row: any): AdminRider {
  const riderId = String(row.id || row._id || row.riderId || "RDR-UNKNOWN");
  const name = row.name || row.fullName || row.displayName || "QuickPress Delivery Rider";
  const phone = row.phone || row.mobile || "—";
  const email = row.email || "—";
  const city = row.city || "Kasganj";
  const zone = row.zone || "Central Kasganj Zone";
  const vehicle = row.vehicle || row.vehicleType || "Motorbike";
  const plate = row.plate || row.vehicleNumber || "—";
  const trips = typeof row.trips === "number" ? row.trips : Number(row.trips ?? 0);
  const rating = (Number(row.rating ?? 5.0)).toFixed(1);
  const isOnline = Boolean(row.isOnline || row.is_available || row.live === "Online" || row.live === "On delivery");

  const isResubmitted = Boolean(row.resubmitted);

  let status: AdminRider["status"] = "Active";
  const rawStatus = String(row.status || "").toLowerCase();
  if (rawStatus === "pending" || isResubmitted) {
    status = "Pending";
  } else if (rawStatus === "suspended" || rawStatus === "rejected") {
    status = "Suspended";
  } else {
    status = "Active";
  }

  let kyc: AdminRider["kyc"] = "Verified";
  const rawKyc = String(row.kyc || row.kycStatus || "").toLowerCase();
  if (rawKyc === "pending" || isResubmitted) {
    kyc = "Pending";
  } else if (rawKyc === "rejected" || status === "Suspended") {
    kyc = "Rejected";
  }

  const walletNum = typeof row.walletRaw === "number" ? row.walletRaw : (typeof row.wallet === "number" ? row.wallet : 0.0);
  const codNum = typeof row.codCashRaw === "number" ? row.codCashRaw : (typeof row.codCash === "number" ? row.codCash : 0.0);

  const regTs = row.registrationTimestamp || row.created_at || row.createdAt || new Date().toISOString();
  const lastLoginTs = row.lastLoginTimestamp || row.updated_at || row.last_login_at || regTs;

  let liveState: AdminRider["live"] = "Offline";
  if (row.live === "On delivery") {
    liveState = "On delivery";
  } else if (isOnline) {
    liveState = "Online";
  }

  return {
    id: riderId,
    name,
    phone,
    email,
    city,
    zone,
    vehicle,
    plate,
    trips,
    rating,
    wallet: `₹${walletNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    walletRaw: walletNum,
    codCash: `₹${codNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    codCashRaw: codNum,
    bankName: row.bankName || "—",
    accountLast4: row.accountLast4 || "—",
    ifsc: row.ifsc || "—",
    upiId: row.upiId || "—",
    joinedOn: strSafeDate(regTs),
    registrationTimestamp: String(regTs),
    lastActive: strSafeDate(lastLoginTs),
    lastLoginTimestamp: String(lastLoginTs),
    kyc,
    live: liveState,
    status,
    resubmitted: isResubmitted,
    resubmittedAt: row.resubmittedAt ? String(row.resubmittedAt) : undefined,
    resubmissionCount: typeof row.resubmissionCount === "number" ? row.resubmissionCount : undefined,
    rejectionReason: row.rejectionReason || row.kycReason || undefined,
    raw: row,
  };
}

function strSafeDate(val: any): string {
  if (!val) return new Date().toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

/** GET /api/admin/riders — resilient multi-format pagination fetch */
export async function fetchRiders(): Promise<AdminRider[]> {
  try {
    const first = await apiGetJson<any>("/api/admin/riders?page=1&pageSize=100");
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
          const next = await apiGetJson<any>(`/api/admin/riders?page=${page}&pageSize=${pageSize}`);
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
    return items.map(toAdminRider);
  } catch (err) {
    console.error("fetchRiders error:", err);
    return [];
  }
}

/** GET /api/admin/riders/stats */
export async function fetchRiderStats(): Promise<RiderStats> {
  try {
    return await apiGetJson<RiderStats>("/api/admin/riders/stats");
  } catch {
    return {
      totalFleet: 0,
      onlineFleet: 0,
      onDelivery: 0,
      availableDispatch: 0,
      kycVerified: 0,
      kycPending: 0,
      suspendedFleet: 0,
      totalTripsDelivered: 0,
      totalEarningsPaid: 0,
      fleetUtilization: 0,
    };
  }
}

/** GET /api/admin/riders/{id} */
export async function fetchRider(id: string): Promise<AdminRider> {
  const row = await apiGetJson<any>(`/api/admin/riders/${encodeURIComponent(id)}`);
  return toAdminRider(row);
}

/** GET /api/admin/riders/{id}/360 */
export async function fetchRider360(id: string): Promise<Rider360Data> {
  return await apiGetJson<Rider360Data>(`/api/admin/riders/${encodeURIComponent(id)}/360`);
}

/** POST /api/admin/riders/{id}/approve|reject|suspend|activate */
export async function setRiderStatus(
  id: string,
  action: "approve" | "reject" | "suspend" | "activate",
  reason?: string,
  rejectedDocuments?: string[]
) {
  return apiPostJson<{ id: string; status: string } | null>(
    `/api/admin/riders/${encodeURIComponent(id)}/${action}`,
    { reason, rejectedDocuments }
  );
}

/** POST /api/admin/riders/{id}/wallet/adjust */
export async function adjustRiderWallet(id: string, amount: number, reason: string, isCodSettlement = false) {
  return apiPostJson<{ ok: boolean; newBalance: number; newCodCash: number }>(`/api/admin/riders/${encodeURIComponent(id)}/wallet/adjust`, {
    amount,
    reason,
    isCodSettlement,
  });
}

/** POST /api/admin/riders/{id}/notify */
export async function sendRiderNotification(id: string, title: string, body: string) {
  return apiPostJson<{ ok: boolean; sent: boolean }>(`/api/admin/riders/${encodeURIComponent(id)}/notify`, { title, body });
}

/** POST /api/admin/riders/{id}/logout-sessions */
export async function logoutRiderSessions(id: string) {
  return apiPostJson<{ ok: boolean; invalidated: boolean }>(`/api/admin/riders/${encodeURIComponent(id)}/logout-sessions`, {});
}

/** PUT /api/admin/riders/{id} — edit rider profile, vehicle, and bank details */
export async function updateRider(id: string, payload: Record<string, unknown>) {
  return apiPutJson<Record<string, unknown>>(`/api/admin/riders/${encodeURIComponent(id)}`, payload);
}

/** DELETE /api/admin/riders/{id} — permanently remove rider */
export async function deleteRider(id: string) {
  return apiDeleteJson<{ ok: boolean; deleted: string }>(`/api/admin/riders/${encodeURIComponent(id)}`);
}
