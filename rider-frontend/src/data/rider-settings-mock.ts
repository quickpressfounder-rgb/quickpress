/**
 * Rider Settings & Account module (Sprint 4.9) — UI-only mock data.
 * Nothing here writes to the backend; screens keep state in React + localStorage.
 */

export type RiderAccountProfile = {
  fullName: string;
  riderId: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  emergencyContact: string;
  joinedOn: string;
  rating: number;
  totalTrips: number;
  photoUrl: string | null;
  kycStatus: "verified" | "pending" | "rejected";
};

export type RiderVehicleInfo = {
  vehicleType: string;
  vehicleNumber: string;
  model: string;
  insuranceExpiry: string;
  pucExpiry: string;
};

export type RiderDocument = {
  id: string;
  label: string;
  number: string;
  status: "verified" | "pending" | "expired";
  expiresOn: string;
};

export type DeviceSession = {
  id: string;
  device: string;
  platform: string;
  location: string;
  lastActive: string;
  current: boolean;
};

export type WorkSettings = {
  online: boolean;
  autoAccept: boolean;
  autoAcceptRadiusKm: number;
  preferredArea: string;
  preferredShift: string;
  language: string;
};

export type NotificationSettings = {
  deliveryAlerts: boolean;
  customerMessages: boolean;
  partnerMessages: boolean;
  promotions: boolean;
  earnings: boolean;
  wallet: boolean;
  sound: boolean;
  vibration: boolean;
};

export type ThemeMode = "light" | "dark" | "system";

export type SecuritySettings = {
  twoFactor: boolean;
  biometricUnlock: boolean;
  shareLiveLocation: boolean;
  shareAnalytics: boolean;
  personalisedOffers: boolean;
};

export const RIDER_ACCOUNT_PROFILE: RiderAccountProfile = {
  fullName: "",
  riderId: "",
  phone: "",
  email: "",
  city: "",
  address: "",
  emergencyContact: "",
  joinedOn: "",
  rating: 5.0,
  totalTrips: 0,
  photoUrl: null,
  kycStatus: "pending",
};

export const RIDER_VEHICLE_INFO: RiderVehicleInfo = {
  vehicleType: "",
  vehicleNumber: "",
  model: "",
  insuranceExpiry: "",
  pucExpiry: "",
};

export const RIDER_DOCUMENTS: RiderDocument[] = [];

export const DEVICE_SESSIONS: DeviceSession[] = [];

export const PREFERRED_AREAS = [
  "Andheri East",
  "Bandra West",
  "Powai",
  "Lower Parel",
  "Thane West",
  "Navi Mumbai",
] as const;

export const PREFERRED_SHIFTS = [
  { id: "morning", label: "Morning", hint: "6:00 AM – 2:00 PM" },
  { id: "evening", label: "Evening", hint: "2:00 PM – 10:00 PM" },
  { id: "night", label: "Night", hint: "10:00 PM – 6:00 AM" },
  { id: "flexible", label: "Flexible", hint: "Any time, surge first" },
] as const;

export const RIDER_LANGUAGES = ["English", "हिन्दी", "मराठी", "தமிழ்", "বাংলা", "ગુજરાતી"] as const;

export const DEFAULT_WORK_SETTINGS: WorkSettings = {
  online: true,
  autoAccept: false,
  autoAcceptRadiusKm: 4,
  preferredArea: "Andheri East",
  preferredShift: "morning",
  language: "English",
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  deliveryAlerts: true,
  customerMessages: true,
  partnerMessages: true,
  promotions: false,
  earnings: true,
  wallet: true,
  sound: true,
  vibration: false,
};

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  twoFactor: false,
  biometricUnlock: true,
  shareLiveLocation: true,
  shareAnalytics: true,
  personalisedOffers: false,
};

export const APP_INFO = {
  version: "4.9.0",
  build: "20260807.1",
  channel: "Production",
  releasedOn: "07 Aug 2026",
  about:
    "QuickPress Rider is the delivery partner app of the QuickPress network — assignments, live navigation, earnings and payouts in one place.",
};

export const LEGAL_DOCUMENTS = [
  {
    id: "privacy",
    title: "Privacy Policy",
    updatedOn: "12 Jun 2026",
    body: [
      "We collect only the data required to assign deliveries, calculate payouts and keep riders safe: identity and KYC documents, vehicle details, live location while you are online, and delivery activity.",
      "Live location is captured only between going online and completing your last delivery. You can switch off location sharing from Security → Privacy, though assignments pause while it is off.",
      "Your documents are shared with verification partners and, where legally required, with law-enforcement agencies. They are never sold to advertisers.",
    ],
  },
  {
    id: "terms",
    title: "Terms & Conditions",
    updatedOn: "12 Jun 2026",
    body: [
      "By using QuickPress Rider you agree to complete accepted deliveries, keep documents valid, and follow all traffic and safety regulations in your service city.",
      "Payouts are calculated per completed delivery plus applicable incentives, and settle to your verified bank account on the published payout cycle.",
      "Repeated cancellations, fraudulent proof-of-delivery or misuse of customer data may lead to suspension of your rider account.",
    ],
  },
  {
    id: "agreement",
    title: "Rider Agreement",
    updatedOn: "02 Apr 2026",
    body: [
      "You operate as an independent delivery partner. Nothing in this agreement creates an employment relationship with QuickPress.",
      "You are responsible for your vehicle, its insurance, its road-worthiness and all statutory permits required to operate it.",
      "QuickPress may update commission structures and incentive slabs with prior in-app notice of at least seven days.",
    ],
  },
  {
    id: "help",
    title: "Help Center",
    updatedOn: "01 Aug 2026",
    body: [
      "Delivery issues: open the delivery from Orders and use “Report an issue” to reach the on-duty support team within 2 minutes.",
      "Payout issues: Wallet → Transactions shows every credit and deduction. Raise a dispute within 7 days of the payout date.",
      "Account and document issues: write to riders@quickpress.in or call the 24×7 rider helpline on 1800 200 4411.",
    ],
  },
  {
    id: "grievance",
    title: "Grievance Redressal & Safety",
    updatedOn: "10 Sep 2026",
    body: [
      "QuickPress maintains a 24x7 dedicated Captain grievance and emergency assistance desk.",
      "In case of on-road emergency or harassment, trigger the SOS button in the app or call the Rider Helpline.",
      "For statutory dispute escalations, write directly to official.quickpress@gmail.com (Nodal Officer, Consumer Protection Rules 2020).",
    ],
  },
] as const;

export type LegalDocumentId = (typeof LEGAL_DOCUMENTS)[number]["id"];