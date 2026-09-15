// Partner app domain types. These mirror the shared QuickPress backend contracts
// consumed by both customer-frontend and partner-frontend.

export type PartnerAuthStep = "phone" | "otp" | "registration" | "ready";

export type PartnerSession = {
  partnerId: string;
  phone: string;
  email?: string | null;
  businessName: string;
  ownerName?: string;
  city?: string;
  isVerified: boolean;
  isOnboarded: boolean;
};

export type BusinessCategory = "laundry" | "dry-clean" | "premium" | "shoe-care";

export type BusinessRegistrationPayload = {
  businessName: string;
  ownerName: string;
  category: BusinessCategory;
  gstin?: string;
  address: string;
  city: string;
  state?: string;
  area?: string;
  pincode: string;
  servicePincodes?: string[];
  sectors?: string[];
  openingTime: string;
  closingTime: string;
  email?: string;
  phone?: string;
  pan?: string;
  aadhaar?: string;
  experience?: string;
  pickupRadiusKm?: number;
  deliveryRadiusKm?: number;
  weeklyOff?: string;
  emergencyClosing?: string;
  accountHolder?: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  logo?: string;
  banner?: string;
  gallery?: string[];
  latitude?: number;
  longitude?: number;
  services?: Array<string | { name: string; price: number; unit: string; turnaroundHours?: number; enabled?: boolean }>;
  agreementSigned?: boolean;
  signatureUrl?: string;
  signedAt?: string;
  signedByName?: string;
  agreementVersion?: string;
};

export type PartnerOrderStatus =
  | "new"
  | "accepted"
  | "picked"
  | "processing"
  | "ready"
  | "delivered"
  | "cancelled";

export type PartnerOrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
};

export type PartnerOrder = {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  status: PartnerOrderStatus;
  placedAt: string;
  slot: string;
  address: string;
  itemCount: number;
  amount: number;
  paymentMode: "online" | "cod";
  serviceLabel: string;
  items: PartnerOrderItem[];
  timeline: { id: string; label: string; time: string; done: boolean }[];
};

export type PartnerServiceRate = {
  id: string;
  name: string;
  unit: string;
  price: number;
  turnaroundHours: number;
  enabled: boolean;
  category: BusinessCategory;
  description?: string;
  image?: string;
  pendingApproval?: boolean;
  approvalStatus?: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  pendingChanges?: Record<string, any>;
};

export type EarningsPoint = {
  label: string;
  amount: number;
};

export type EarningsSummary = {
  today: number;
  week: number;
  month: number;
  pendingPayout: number;
  completedOrders: number;
  avgOrderValue: number;
  trend: EarningsPoint[];
  payouts: {
    id: string;
    date: string;
    amount: number;
    status: "paid" | "processing" | "failed";
    utr: string;
  }[];
};

export type PartnerWalletSummary = {
  availableBalance: number;
  onHold: number;
  lifetimeEarned: number;
  bankLast4: string;
  autoPayout: boolean;
};

export type PartnerWalletTransaction = {
  id: string;
  title: string;
  date: string;
  amount: number;
  direction: "credit" | "debit";
  status: "success" | "pending" | "failed";
  kind: "order-payout" | "settlement" | "penalty" | "incentive" | "withdrawal";
};

export type PartnerProfile = {
  partnerId: string;
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  city: string;
  rating: number;
  totalOrders: number;
  joinedOn: string;
  onTimeRate: number;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum";
  logo?: string;
  logoUrl?: string;
  banner?: string;
  bannerUrl?: string;
  cover?: string;
  image?: string;
  description?: string;
  category?: string;
  gstin?: string;
  address?: string;
  area?: string;
  isVerified?: boolean;
  status?: string;
  gallery?: string[];
};

export type BusinessSettings = {
  isStoreOpen: boolean;
  acceptingNewOrders: boolean;
  autoAcceptOrders: boolean;
  expressDelivery: boolean;
  pickupRadiusKm: number;
  openingTime: string;
  closingTime: string;
  weeklyOff: string;
  dailyOrderCap: number;
};

export type PartnerNotification = {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  kind: "order" | "payout" | "alert" | "promo";
};
