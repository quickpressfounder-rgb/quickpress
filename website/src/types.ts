export type PageType =
  | "home"
  | "about"
  | "services"
  | "how-it-works"
  | "partners"
  | "ecosystem"
  | "contact"
  | "privacy"
  | "terms";

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
