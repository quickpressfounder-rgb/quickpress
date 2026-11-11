export type PageType =
  | "home"
  | "about"
  | "contact"
  | "privacy"
  | "terms"
  | "b2b-partner"
  | "store";

export interface B2BPartnerLead {
  id?: string;
  businessName: string;
  category: string;
  address: string;
  city: string;
  pincode: string;
  unitsCount: string;
  contactName: string;
  designation: string;
  phone: string;
  whatsapp?: string;
  email: string;
  dailyVolume: string;
  frequency: string;
  services: string[];
  sla: string;
  gstin?: string;
  pan?: string;
  billingModel: string;
  creditTerms: string;
  trialRequested: boolean;
  trialDate?: string;
  specialNotes?: string;
  status?: string;
  createdAt?: string;
}

export type ModalType =
  | "booking"
  | "partner"
  | "contact"
  | "service_detail"
  | "download_app"
  | null;

export interface ServiceInfo {
  id: string;
  title: string;
  category: string;
  desc: string;
  tagline: string;
  price: string;
  turnaround: string;
  features: string[];
  accentColor: string;
  bgLight: string;
}

export interface JobPosition {
  id: string;
  title: string;
  dept: string;
  type: string;
  location: string;
  salary: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
}

export interface PartnerCaseStudy {
  name: string;
  business: string;
  location: string;
  category: string;
  growth: string;
  monthlyRevenue: string;
  quote: string;
  duration: string;
}

export interface TeamMember {
  name: string;
  role: string;
  prevCompany: string;
  bio: string;
  avatar: string;
}
