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
  status?: string;
  kycStatus?: string;
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
  ownerPhoto?: string;
  aadhaarFront?: string;
  aadhaarBack?: string;
  panCard?: string;
  chequePhoto?: string;
  alternatePhone?: string;
  gender?: string;
  dob?: string;
  servicePrices?: Record<string, number>;
  serviceTurnarounds?: Record<string, number>;
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
  referral_code?: string;
  referralCode?: string;
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

export type DefectType =
  | "stain"
  | "torn_or_cut"
  | "broken_button"
  | "color_bleed_risk"
  | "burn_mark"
  | "missing_accessory"
  | "other";

export type CustomerDefectStatus = "pending" | "proceed_wash" | "return_unwashed";

export type GarmentDefect = {
  defect_id: string;
  order_id: string;
  order_code?: string;
  item_name: string;
  defect_type: DefectType;
  photo_url: string;
  description?: string;
  reported_by_id: string;
  reported_by_role?: string;
  reported_by_name?: string;
  reported_at: string;
  customer_status: CustomerDefectStatus;
  customer_note?: string;
  customer_responded_at?: string | null;
  admin_override_status?: string | null;
  admin_override_notes?: string | null;
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
  garmentDefects?: GarmentDefect[];
  hasDefectsReported?: boolean;
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
  pan?: string;
  panCard?: string;
  aadhaar?: string;
  aadhaarFront?: string;
  aadhaarBack?: string;
  bankName?: string;
  accountHolder?: string;
  accountNumber?: string;
  ifsc?: string;
  chequePhoto?: string;
  signatureUrl?: string;
  signedByName?: string;
  signedAt?: string;
  agreementVersion?: string;
  kycStatus?: string;
  isOnboarded?: boolean;
  pincode?: string;
  state?: string;
  ownerPhoto?: string;
  hasPendingApproval?: boolean;
  pendingChangesCount?: number;
};

export type BusinessSettings = {
  isStoreOpen: boolean;
  acceptingNewOrders: boolean;
  autoAcceptOrders: boolean;
  expressDelivery: boolean;
  pickupRadiusKm: number;
  deliveryRadiusKm?: number;
  servicePincodes?: string[];
  sectors?: string[];
  openingTime: string;
  closingTime: string;
  weeklyOff: string;
  dailyOrderCap: number;
  autoScheduleEnabled?: boolean;
  manualOverride?: boolean;
  manualOverrideAction?: string | null;
  manualOverrideDate?: string | null;
  manualOverrideAt?: string | null;
  scheduleStatusText?: string | null;
  nextScheduledTransition?: string | null;
};

export type PartnerNotification = {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  kind: "order" | "payout" | "alert" | "promo";
  orderId?: string;
  orderCode?: string;
  category?: string;
};
