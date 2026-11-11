/**
 * QuickPress B2B Commercial Enterprise Admin API Client.
 */

import { apiGetJson, apiPostJson, apiPutJson, apiPatchJson } from "@/api/core/transport";

export interface B2BAgingBuckets {
  current_0_15: number;
  due_16_30: number;
  overdue_31_60: number;
  critical_60_plus: number;
}

export interface B2BStats {
  activeAccounts: number;
  totalClientsCount: number;
  todayVolumeKg: number;
  monthlyBillingGmv: number;
  outstandingAr: number;
  activeCargoDispatches: number;
  agingBuckets: B2BAgingBuckets;
}

export interface B2BContract {
  baseRatePerKg: number;
  itemizedRates: Record<string, number>;
  addons: Record<string, number>;
  billingCycle: "WEEKLY" | "BI_WEEKLY" | "MONTHLY";
  creditTerms: "NET_7_DAYS" | "NET_15_DAYS" | "NET_30_DAYS";
  creditLimit: number;
  autoHoldEnabled: boolean;
  sla: string;
}

export interface B2BContactLog {
  timestamp: string;
  note: string;
  status: string;
  manager: string;
}

export interface B2BClient {
  _id: string;
  id: string;
  b2bId: string;
  businessName: string;
  category: string;
  address: string;
  city: string;
  pincode: string;
  unitsCount?: string;
  contactName: string;
  designation?: string;
  phone: string;
  whatsapp?: string;
  email: string;
  gstin?: string | null;
  pan?: string | null;
  dailyVolume?: string;
  frequency?: string;
  sla?: string;
  status: "NEW_INQUIRY" | "CONTACTED" | "TRIAL_SCHEDULED" | "CONTRACT_ACTIVE" | "SUSPENDED" | "CLOSED";
  accountManager: string;
  assignedHubId?: string | null;
  assignedHubName?: string;
  contract: B2BContract;
  currentBalance: number;
  totalOrdersCount: number;
  totalVolumeKg: number;
  contactLogs?: B2BContactLog[];
  services?: string[];
  billingModel?: string;
  creditTerms?: string;
  trialRequested?: boolean;
  specialNotes?: string;
  trialDate?: string;
  trialSlot?: string;
  createdAt: string;
  updatedAt: string;
}

export interface B2BOrder {
  _id: string;
  id: string;
  orderCode: string;
  b2bId: string;
  businessName: string;
  category: string;
  address?: string;
  city?: string;
  contactName?: string;
  phone?: string;
  pickupDate: string;
  pickupSlot: string;
  sla: string;
  estimatedKg: number;
  doorstepScaleKg?: number | null;
  hubScaleKg?: number | null;
  tareWeightKg?: number;
  netKg?: number | null;
  variancePercent?: number;
  varianceStatus?: "SAFE" | "ALERT";
  bagCount: number;
  bagBarcodes: string[];
  scannedBagsDoorstep?: string[];
  scannedBagsHub?: string[];
  assignedDriver: {
    id?: string | null;
    name: string;
    phone?: string | null;
    vehicleType: "cargo" | "van" | "auto" | "bike";
  };
  assignedHub: {
    id?: string | null;
    name: string;
  };
  serviceType: string;
  specialInstructions?: string;
  status: "SCHEDULED" | "DISPATCHED_PICKUP" | "PICKED_UP" | "AT_HUB_PROCESSING" | "READY_FOR_DELIVERY" | "DELIVERED";
  billed: boolean;
  invoiceId?: string | null;
  pod?: {
    storekeeperName: string;
    signatureUrl?: string;
    bayPhotoUrl?: string;
    notes?: string;
    deliveredAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface B2BInvoiceItem {
  description: string;
  sac: string;
  qty: string;
  rate: number;
  amount: number;
}

export interface B2BPaymentRecord {
  utrNumber: string;
  amount: number;
  tdsDeducted?: number;
  totalCredit?: number;
  paymentDate: string;
  bankName?: string;
  mode?: string;
  remarks?: string;
  recordedAt: string;
}

export interface B2BInvoice {
  _id: string;
  id: string;
  invoiceNumber: string;
  b2bId: string;
  businessName: string;
  category: string;
  address?: string;
  city?: string;
  gstin?: string | null;
  pan?: string | null;
  contactName?: string;
  phone?: string;
  email?: string;
  creditTerms: string;
  billingPeriod: string;
  invoiceDate: string;
  dueDate: string;
  totalKg: number;
  ratePerKg: number;
  items: B2BInvoiceItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  taxTotal: number;
  totalAmount: number;
  balanceDue: number;
  status: "UNPAID" | "PARTIAL" | "PAID" | "OVERDUE";
  agingBucket: "current_0_15" | "due_16_30" | "overdue_31_60" | "critical_60_plus";
  ordersIncluded?: string[];
  payments: B2BPaymentRecord[];
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// API Calls
// -----------------------------------------------------------------------------

export async function fetchB2BStats(): Promise<B2BStats> {
  return apiGetJson<B2BStats>("/api/b2b/admin/stats");
}

export async function fetchB2BClients(params?: {
  query?: string;
  status?: string;
  category?: string;
}): Promise<{ total: number; items: B2BClient[] }> {
  return apiGetJson<{ total: number; items: B2BClient[] }>("/api/b2b/admin/clients", {
    query: params,
  });
}

export async function createB2BClient(payload: Partial<B2BClient>): Promise<{ success: boolean; b2bId: string; data: B2BClient }> {
  return apiPostJson("/api/b2b/admin/clients", payload);
}

export async function updateB2BContract(
  b2bId: string,
  payload: {
    baseRatePerKg: number;
    itemizedRates?: Record<string, number>;
    addons?: Record<string, number>;
    billingCycle?: string;
    creditTerms?: string;
    creditLimit?: number;
    autoHoldEnabled?: boolean;
    assignedHubId?: string;
    assignedHubName?: string;
    sla?: string;
    accountManager?: string;
    notes?: string;
  }
): Promise<{ success: boolean; message: string; contract: B2BContract }> {
  return apiPutJson(`/api/b2b/admin/clients/${b2bId}/contract`, payload);
}

export async function fetchB2BOrders(params?: {
  status?: string;
  b2b_id?: string;
}): Promise<{ total: number; items: B2BOrder[] }> {
  return apiGetJson<{ total: number; items: B2BOrder[] }>("/api/b2b/admin/orders", {
    query: params,
  });
}

export async function createB2BOrder(payload: {
  b2bId: string;
  pickupDate?: string;
  pickupSlot?: string;
  estimatedKg: number;
  bagCount: number;
  serviceType?: string;
  specialInstructions?: string;
}): Promise<{ success: boolean; order: B2BOrder }> {
  return apiPostJson("/api/b2b/admin/orders", payload);
}

export async function assignB2BOrderLogistics(
  orderId: string,
  payload: {
    driverId?: string;
    driverName?: string;
    driverPhone?: string;
    vehicleType?: string;
    hubId?: string;
    hubName?: string;
  }
): Promise<{ success: boolean; message: string }> {
  return apiPatchJson(`/api/b2b/admin/orders/${orderId}/assign`, payload);
}

export async function recordB2BWeighIn(
  orderId: string,
  payload: {
    stage: "doorstep" | "hub";
    scaleWeightKg: number;
    tareWeightKg?: number;
    bagBarcodes?: string[];
  }
): Promise<{ success: boolean; message: string }> {
  return apiPatchJson(`/api/b2b/admin/orders/${orderId}/weigh-in`, payload);
}

export async function updateB2BOrderStatus(
  orderId: string,
  status: string
): Promise<{ success: boolean; status: string }> {
  return apiPatchJson(`/api/b2b/admin/orders/${orderId}/status?status_val=${encodeURIComponent(status)}`);
}

export async function fetchB2BInvoices(params?: {
  b2b_id?: string;
  status?: string;
}): Promise<{ total: number; items: B2BInvoice[] }> {
  return apiGetJson<{ total: number; items: B2BInvoice[] }>("/api/b2b/admin/invoices", {
    query: params,
  });
}

export async function generateB2BInvoice(payload: {
  b2bId: string;
  billingPeriod?: string;
  orderIds?: string[];
  totalKg?: number;
  ratePerKg?: number;
  dueDateDays?: number;
}): Promise<{ success: boolean; invoice: B2BInvoice }> {
  return apiPostJson("/api/b2b/admin/invoices/generate", payload);
}

export async function recordB2BPayment(
  invoiceId: string,
  payload: {
    utrNumber: string;
    amount: number;
    paymentDate?: string;
    bankName?: string;
    tdsDeducted?: number;
    mode?: string;
    remarks?: string;
  }
): Promise<{ success: boolean; message: string; invoiceStatus: string; remainingBalance: number }> {
  return apiPostJson(`/api/b2b/admin/invoices/${invoiceId}/pay`, payload);
}

export function getB2BInvoicePdfUrl(invoiceId: string): string {
  return `/api/b2b/admin/invoices/${encodeURIComponent(invoiceId)}/pdf`;
}

export async function scheduleB2BTrial(
  leadId: string,
  payload: {
    trialDate: string;
    pickupSlot?: string;
    assignedHubId?: string;
    assignedHubName?: string;
    trialKg?: number;
    instructions?: string;
  }
): Promise<{ success: boolean; message: string }> {
  return apiPostJson(`/api/b2b/admin/leads/${leadId}/trial`, payload);
}

export async function convertB2BLeadToContract(
  leadId: string
): Promise<{ success: boolean; message: string }> {
  return apiPostJson(`/api/b2b/admin/leads/${leadId}/convert`, {});
}

