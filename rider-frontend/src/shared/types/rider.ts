// Rider app domain types. These mirror the shared QuickPress backend contracts
// consumed by customer-frontend and partner-frontend. UI only — no backend.

export type RiderSession = {
  riderId: string;
  phone: string;
  fullName: string;
  isVerified: boolean;
  isOnboarded: boolean;
  isNewRider: boolean;
  token?: string;
  refreshToken?: string;
};

export type VehicleType = "bike" | "scooter" | "ev-scooter" | "cycle" | "mini-truck";

export type RiderRegistrationPayload = {
  photoName: string;
  fullName: string;
  phone: string;
  email: string;
  vehicleType: VehicleType;
  vehicleNumber: string;
  drivingLicense: string;
  aadhaar: string;
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
  serviceCity: string;
};

export type RiderDashboard = {
  riderName: string;
  isOnline: boolean;
  todayDeliveries: number;
  todayEarnings: number;
  pendingPickups: number;
  pendingDeliveries: number;
  completedDeliveries: number;
  rating: number;
  onlineMinutes: number;
};

export type RiderTaskType = "pickup" | "delivery";

export type RiderOrderStatus =
  | "assigned"
  | "accepted"
  | "arriving"
  | "picked"
  | "at-partner"
  | "ready-for-delivery"
  | "delivered"
  | "cancelled"
  | "failed";

export type RiderOrder = {
  id: string;
  code: string;
  taskType: RiderTaskType;
  status: RiderOrderStatus;
  customerName: string;
  customerPhone: string;
  partnerName: string;
  partnerPhone: string;
  pickupAddress: string;
  deliveryAddress: string;
  distanceKm: number;
  etaMinutes: number;
  estimatedEarning: number;
  itemCount: number;
  slot: string;
  placedAt: string;
  paymentMode: "online" | "cod";
  timeline: { id: string; label: string; time: string; done: boolean }[];
};

export type RiderWalletSummary = {
  todayEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  availableBalance: number;
  bankLast4: string;
  incentiveProgress: number;
};

export type RiderTransaction = {
  id: string;
  title: string;
  date: string;
  amount: number;
  direction: "credit" | "debit";
  status: "success" | "pending";
  kind: "trip" | "incentive" | "withdrawal" | "penalty" | "tip";
};

export type RiderNotificationKind =
  | "new-order"
  | "pickup-reminder"
  | "delivery-reminder"
  | "payment"
  | "system";

export type RiderNotification = {
  id: string;
  kind: RiderNotificationKind;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  orderId?: string;
};

export type RiderProfile = {
  id?: string;
  name?: string;
  riderId: string;
  fullName: string;
  phone: string;
  email: string;
  city: string;
  rating: number;
  totalTrips: number;
  joinedOn: string;
  vehicleType: VehicleType;
  vehicleNumber: string;
  bankName: string;
  accountLast4: string;
  ifsc: string;
  kycStatus: "verified" | "pending" | "rejected";
  isVerified?: boolean;
  status?: string;
  photo?: string;
  documents: { id: string; label: string; status: "verified" | "pending" | "rejected" }[];
  [key: string]: any;
};

export type RiderHistoryEntry = {
  id: string;
  code: string;
  customerName: string;
  customerPhone?: string;
  partnerName: string;
  partnerPhone?: string;
  pickupAddress?: string;
  pickupPhone?: string;
  pickupTime?: string;
  acceptedTime?: string;
  arrivedPickupTime?: string;
  pickupOtp?: string;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  storeArrivalTime?: string;
  storeDispatchTime?: string;
  dispatchOtp?: string;
  bagCount?: number;
  itemSummary?: string;
  storeNotes?: string;
  dropAddress?: string;
  deliveryArrivalTime?: string;
  deliveredTime?: string;
  deliveryOtp?: string;
  date: string;
  amount: number;
  orderTotal?: number;
  distanceKm: number;
  durationMinutes?: number;
  pickupTransitMinutes?: number;
  storeProcessingMinutes?: number;
  deliveryTransitMinutes?: number;
  outcome: "completed" | "cancelled" | "failed";
  paymentType?: string;
  paymentStatus?: string;
  rideType?: string;
  rating?: number;
  feedback?: string;
  baseFare?: number;
  distanceBonus?: number;
  surgeBonus?: number;
  bagSurcharge?: number;
  tipAmount?: number;
  serviceCharges?: number;
  customerDeliveryFee?: number;
  customerGst?: number;
  reviewed?: boolean;
  riderReview?: {
    customerRating: number;
    customerFeedback?: string;
    customerTags?: string[];
    storeRating?: number;
    storeFeedback?: string;
    storeTags?: string[];
    createdAt?: string;
  };
};

