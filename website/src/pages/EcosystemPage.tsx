import React, { useState, useEffect, useMemo } from "react";
import { PageType, ModalType } from "@/types";
import {
  IconCheck,
  IconMapPin,
  IconArrowRight,
  IconSmartphone,
  IconHandshake,
  IconVan,
  IconChevronDown,
  IconSearch,
} from "@/components/Icons";
import customerLogo from "@/assets/quickpress-customer-logo.jpg";
import partnerLogo from "@/assets/quickpress-partner-logo.png";
import captainLogo from "@/assets/quickpress-captain-logo.jpg";

const GREEN = "#1A7A3C";
const YELLOW = "#F59E0B";

const PANELS_DATA = [
  {
    id: "customer",
    name: "QuickPress",
    badgeLabel: "QuickPress Customer Panel",
    badge: "Consumer Mobile App & Web",
    tagline: "Effortless 1-Click Ordering, Live GPS Tracking & Transparent Fabric Care",
    target: "Consumers, Families & Working Professionals",
    accentColor: GREEN,
    bgLight: "#FEF9C3",
    borderColor: "border-yellow-400",
    icon: IconSmartphone,
    logoImg: customerLogo,
    logoBg: "bg-[#FBBF24]",
    description:
      "Designed for seamless customer experience, allowing consumers to schedule doorstep laundry, track pickup captains in real-time, customize washing preferences, and pay securely with digital receipts.",
    capabilities: [
      "1-Click Doorstep Pickup Scheduling with 1-hour preferred slots",
      "Real-Time Geospatial Captain Map Tracking with live countdown ETA",
      "Custom Fabric Care Profiles (Hypoallergenic, Starch intensity, Fold vs Hanger)",
      "Itemized Digital Invoices & Weight Validation before payment",
      "Seamless UPI, Credit/Debit Card & Cash on Delivery payment options",
      "Exclusive App-Only Loyalty Points, Repeat Subscriptions & Special Offers",
    ],
    mockPreview: {
      screenTitle: "QuickPress Customer App",
      orderId: "Order #QP-94820 (Live Tracking)",
      status: "Captain is 0.3 km away • ETA 3 Mins",
      items: "5x Formal Shirts, 2x Trousers, 1x Silk Saree",
      actionText: "Get QuickPress Customer App",
    },
  },
  {
    id: "partner",
    name: "QuickPress Partner",
    badgeLabel: "QuickPress Partner Panel",
    badge: "Partner Onboarding & Facility Tablet OS",
    tagline: "Turnkey Order Intake, Capacity Optimization & Direct Weekly Settlements",
    target: "Commercial Laundromats, Dry Cleaners & Franchise Hubs",
    accentColor: "#059669",
    bgLight: "#ECFDF5",
    borderColor: "border-emerald-500",
    icon: IconHandshake,
    logoImg: partnerLogo,
    logoBg: "bg-white",
    description:
      "A complete cloud-based operating system designed for laundromats, dry-cleaners, and franchise owners to manage daily batch queues, print barcode tags, track fabric chemistry, and receive weekly payouts.",
    capabilities: [
      "Automated Order Inflow directly dispatched from QuickPress consumer app",
      "Turnkey Cloud POS with Serialized Barcode Label Printer integration",
      "Dynamic Station Queue Management (Washing, Steam Pressing, QA Audit)",
      "Pre-wash Garment Inspection & In-App Customer Note Alerts",
      "Automated Weekly Direct Bank Settlement Ledger & Volume P&L Reports",
      "B2B Corporate Batch Invoicing & Multi-Facility Management Support",
    ],
    mockPreview: {
      screenTitle: "QuickPress Partner Onboarding",
      orderId: "Facility Batch #42 (Sector 90 Hub)",
      status: "38 Orders In Processing • 92% Machine Load",
      items: "Today's Gross Settled: ₹38,400",
      actionText: "Apply for Partner Panel",
    },
  },
  {
    id: "captain",
    name: "QuickPress Captain",
    badgeLabel: "QuickPress Captain Panel",
    badge: "Captain Rider Fleet & Logistics App",
    tagline: "Smart Batched Routes, Zero Empty Returns & Maximum Rider Payouts",
    target: "Independent Delivery Riders, Couriers & 2-Wheeler Fleet",
    accentColor: "#D97706",
    bgLight: "#FFFBEB",
    borderColor: "border-yellow-500",
    icon: IconVan,
    logoImg: captainLogo,
    logoBg: "bg-white",
    description:
      "A dedicated navigation and delivery execution tool for our fleet captains. Smart clustering algorithms batch multiple nearby pickups and dropoffs together to maximize captain earnings per hour.",
    capabilities: [
      "Smart Multi-Stop Route Clustering (Zero unutilized empty return trips)",
      "Geofenced Doorstep Arrival & Tamper-Evident Bag Barcode Scanning",
      "Contactless Photo Proof of Delivery & Digital Signature capture",
      "Real-Time Daily Earnings, Bonus Incentives & Instant Withdrawal Ledger",
      "In-App Turn-by-Turn GPS Navigation avoiding peak traffic choke points",
      "Direct In-App Customer Communication with number masking for privacy",
    ],
    mockPreview: {
      screenTitle: "QuickPress Captain Console",
      orderId: "Active Route #R-104 (Sector 62 -> 90)",
      status: "4 Pickups • 3 Scheduled Dropoffs",
      items: "Today's Captain Earnings: ₹1,850 + ₹250 Bonus",
      actionText: "Join as QuickPress Captain",
    },
  },
];

interface LiveSector {
  name: string;
  pincode: string;
  eta: string;
}

interface CityCoverageCard {
  id: string;
  city: string;
  state: string;
  tier: string;
  status: string;
  tagline: string;
  deliveryRadius: string;
  avgPickup: string;
  hubs: string;
  captains: string;
  pincodes: string[];
  sectors: LiveSector[];
}

const ADMIN_LIVE_CITIES: CityCoverageCard[] = [
  {
    id: "kasganj",
    city: "Kasganj",
    state: "Uttar Pradesh",
    tier: "Tier-2 Operations Hub",
    status: "100% Live & Operational",
    tagline: "QuickPress Flagship Operations Center & Bilram Gate Master Hub",
    deliveryRadius: "15 km City Radius",
    avgPickup: "6 – 9 Mins",
    hubs: "12 Verified Store Hubs",
    captains: "18+ Active Captains",
    pincodes: ["207123", "207124", "207125"],
    sectors: [
      { name: "Bilram Gate (Master Operations Hub & Central Market)", pincode: "207123", eta: "6 Mins" },
      { name: "Station Road & Railway Colony Corridor", pincode: "207123", eta: "7 Mins" },
      { name: "Soron Gate Bypass & Commercial Center", pincode: "207123", eta: "8 Mins" },
      { name: "Nadrai Gate & Civil Lines Zone", pincode: "207123", eta: "8 Mins" },
      { name: "Ashok Nagar & Awas Vikas Colony", pincode: "207124", eta: "9 Mins" },
      { name: "Ganjdundwara Road & Outer Logistics Belt", pincode: "207125", eta: "10 Mins" },
    ],
  },
  {
    id: "noida",
    city: "Noida",
    state: "Uttar Pradesh",
    tier: "Tier-1 Metro Hub",
    status: "100% Live & Operational",
    tagline: "Bhutani Alphathum Corporate Center & High-Density Corridors",
    deliveryRadius: "15 km Urban Radius",
    avgPickup: "7 – 10 Mins",
    hubs: "45 Verified Store Hubs",
    captains: "60+ Active Captains",
    pincodes: ["201301", "201304", "201305", "201309", "201310"],
    sectors: [
      { name: "Sector 90 (Bhutani Alphathum / Express HQ)", pincode: "201305", eta: "7 Mins" },
      { name: "Sector 62 (Logix Cyber Park / IT Hub / D-Block)", pincode: "201309", eta: "8 Mins" },
      { name: "Sector 75, 76 & 78 (Golf City / Silicon City / Hyde Park)", pincode: "201301", eta: "8 Mins" },
      { name: "Sector 137 & 142 (Advant Navis / Paras Tierea)", pincode: "201305", eta: "9 Mins" },
      { name: "Sector 50 & 51 (Alok Vihar / Sagar / Central Park)", pincode: "201301", eta: "9 Mins" },
      { name: "Sector 18 & 27 (Atta Market / Mall of India / Metro)", pincode: "201301", eta: "10 Mins" },
      { name: "Sector 128 & 132 (Jaypee Greens / Wish Town / Genesis)", pincode: "201304", eta: "10 Mins" },
      { name: "Sector 150 (Sports City / ATS Pristine / Godrej)", pincode: "201310", eta: "11 Mins" },
    ],
  },
  {
    id: "greater-noida",
    city: "Greater Noida & Noida Ext",
    state: "Uttar Pradesh",
    tier: "Tier-1 High Growth Hub",
    status: "100% Live & Operational",
    tagline: "Gaur City Mega Townships & Institutional Belt",
    deliveryRadius: "12 km Cluster Radius",
    avgPickup: "9 – 12 Mins",
    hubs: "22 Verified Store Hubs",
    captains: "40+ Active Captains",
    pincodes: ["201306", "201308", "201310", "201318"],
    sectors: [
      { name: "Gaur City 1 & 2 (1st to 16th Avenue / Galleria Mall)", pincode: "201318", eta: "9 Mins" },
      { name: "TechZone 4 (Cherry County / Nirala Estate / Panchsheel)", pincode: "201306", eta: "10 Mins" },
      { name: "Pari Chowk & Alpha 1 / 2 Commercial Hub", pincode: "201308", eta: "11 Mins" },
      { name: "Knowledge Park 1, 2, 3 (Institutional Campus Zone)", pincode: "201310", eta: "12 Mins" },
      { name: "Beta 1 & 2 / Gamma Residential Corridor", pincode: "201308", eta: "12 Mins" },
    ],
  },
  {
    id: "delhi-ncr",
    city: "Delhi NCR",
    state: "Delhi",
    tier: "Tier-1 Capital Metro",
    status: "100% Live & Operational",
    tagline: "Central, South & East Delhi Premium Garment Logistics",
    deliveryRadius: "18 km Metro Radius",
    avgPickup: "8 – 11 Mins",
    hubs: "80 Verified Store Hubs",
    captains: "110+ Active Captains",
    pincodes: ["110001", "110016", "110020", "110024", "110092"],
    sectors: [
      { name: "Connaught Place, Barakhamba & Central Delhi", pincode: "110001", eta: "8 Mins" },
      { name: "Hauz Khas, Green Park & Safdarjung Enclave", pincode: "110016", eta: "9 Mins" },
      { name: "South Extension, Lajpat Nagar & Defence Colony", pincode: "110024", eta: "9 Mins" },
      { name: "Saket, Malviya Nagar & Mehrauli Heritage Corridor", pincode: "110017", eta: "10 Mins" },
      { name: "Okhla Industrial Area Phase 1-3 & Jasola Vihar", pincode: "110020", eta: "10 Mins" },
      { name: "Laxmi Nagar, Preet Vihar & Mayur Vihar Phase 1", pincode: "110092", eta: "11 Mins" },
    ],
  },
  {
    id: "aligarh",
    city: "Aligarh",
    state: "Uttar Pradesh",
    tier: "Tier-2 Regional Hub",
    status: "100% Live & Operational",
    tagline: "Civil Lines, AMU Campus & Centre Point Commercial Belt",
    deliveryRadius: "12 km Regional Radius",
    avgPickup: "8 – 12 Mins",
    hubs: "24 Verified Store Hubs",
    captains: "35+ Active Captains",
    pincodes: ["202001", "202002"],
    sectors: [
      { name: "Civil Lines & Dodhpur Commercial Core", pincode: "202002", eta: "8 Mins" },
      { name: "Centre Point & Samad Road Shopping Hub", pincode: "202001", eta: "8 Mins" },
      { name: "Ramghat Road & Kishanpur Residential Corridor", pincode: "202001", eta: "9 Mins" },
      { name: "Medical Road & AMU University Campus", pincode: "202002", eta: "10 Mins" },
      { name: "GT Road & Railway Station Logistics Area", pincode: "202001", eta: "11 Mins" },
    ],
  },
  {
    id: "agra",
    city: "Agra",
    state: "Uttar Pradesh",
    tier: "Tier-2 Commercial Center",
    status: "100% Live & Operational",
    tagline: "Sanjay Place Financial Center & Dayalbagh Corridor",
    deliveryRadius: "14 km City Radius",
    avgPickup: "9 – 13 Mins",
    hubs: "30 Verified Store Hubs",
    captains: "42+ Active Captains",
    pincodes: ["282001", "282002", "282005"],
    sectors: [
      { name: "Sanjay Place Financial & Corporate Center", pincode: "282002", eta: "9 Mins" },
      { name: "Kamla Nagar & Dayalbagh Residential Zone", pincode: "282005", eta: "10 Mins" },
      { name: "Fatehabad Road & Taj Ganj Hospitality Belt", pincode: "282001", eta: "11 Mins" },
      { name: "Sadar Bazaar & Agra Cantt Commercial Hub", pincode: "282001", eta: "12 Mins" },
    ],
  },
  {
    id: "mathura",
    city: "Mathura",
    state: "Uttar Pradesh",
    tier: "Tier-2 Transit Hub",
    status: "100% Live & Operational",
    tagline: "Krishna Nagar Commercial Market & Highway Corridor",
    deliveryRadius: "10 km City Radius",
    avgPickup: "10 – 14 Mins",
    hubs: "10 Verified Store Hubs",
    captains: "15+ Active Captains",
    pincodes: ["281001", "281003"],
    sectors: [
      { name: "Krishna Nagar Commercial Market", pincode: "281001", eta: "10 Mins" },
      { name: "Dampier Nagar & Civil Lines Zone", pincode: "281001", eta: "10 Mins" },
      { name: "Highway City & Refinery Township", pincode: "281005", eta: "12 Mins" },
      { name: "Vrindavan Road & Gayatri Tapobhumi Corridor", pincode: "281003", eta: "13 Mins" },
    ],
  },
];

export function EcosystemPage({
  onNavigate,
  onOpenModal,
}: {
  onNavigate: (page: PageType) => void;
  onOpenModal: (type: ModalType) => void;
}) {
  const [activePanelTab, setActivePanelTab] = useState<"customer" | "partner" | "captain">("customer");
  const [selectedState, setSelectedState] = useState<string>("All States");
  const [searchPincode, setSearchPincode] = useState<string>("");
  const [expandedCityIds, setExpandedCityIds] = useState<string[]>(["kasganj", "noida"]);

  const currentPanel = PANELS_DATA.find((p) => p.id === activePanelTab) || PANELS_DATA[0];

  // Unique operational states
  const availableStates = useMemo(() => {
    const states = Array.from(new Set(ADMIN_LIVE_CITIES.map((c) => c.state)));
    return ["All States", ...states];
  }, []);

  // Filtered operational cities
  const filteredCities = useMemo(() => {
    let list = ADMIN_LIVE_CITIES;
    if (selectedState !== "All States") {
      list = list.filter((c) => c.state.toLowerCase() === selectedState.toLowerCase());
    }
    const q = searchPincode.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.city.toLowerCase().includes(q) ||
          c.pincodes.some((pin) => pin.includes(q)) ||
          c.sectors.some((s) => s.name.toLowerCase().includes(q) || s.pincode.includes(q))
      );
    }
    return list;
  }, [selectedState, searchPincode]);

  // Exact or Partial Pincode / Area Match detector
  const searchedMatch = useMemo(() => {
    const q = searchPincode.trim().toLowerCase();
    if (!q || q.length < 3) return null;
    for (const city of ADMIN_LIVE_CITIES) {
      for (const sector of city.sectors) {
        if (sector.pincode.toLowerCase() === q || sector.name.toLowerCase().includes(q)) {
          return { city, sector, matchedPin: sector.pincode };
        }
      }
      if (city.pincodes.some((p) => p.toLowerCase() === q)) {
        return { city, sector: city.sectors[0], matchedPin: q };
      }
      if (city.city.toLowerCase() === q) {
        return { city, sector: city.sectors[0], matchedPin: city.pincodes[0] };
      }
    }
    return null;
  }, [searchPincode]);

  const toggleCity = (cityId: string) => {
    if (expandedCityIds.includes(cityId)) {
      setExpandedCityIds(expandedCityIds.filter((id) => id !== cityId));
    } else {
      setExpandedCityIds([...expandedCityIds, cityId]);
    }
  };

  const handlePanelAction = (panelId: string) => {
    if (panelId === "customer") {
      window.open("https://play.google.com/store/apps", "_blank");
      onOpenModal("download_app");
    } else {
      onOpenModal("partner");
    }
  };

  return (
    <div className="pt-24 sm:pt-32 pb-24 space-y-24 bg-white text-gray-900">
      {/* ─── Hero ────────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold tracking-widest uppercase mb-4 shadow-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-live-dot" />
          <span>QUICKPRESS 3-PANEL ECOSYSTEM • LIVE IN NOIDA & NCR</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black text-gray-950 leading-tight max-w-4xl mx-auto">
          One Connected Engine. <br />
          <span style={{ color: GREEN }}>Three Specialized Panels.</span>
        </h1>
        <p className="text-gray-600 text-base sm:text-xl max-w-3xl mx-auto mt-6 leading-relaxed">
          QuickPress brings together <strong>QuickPress (Customer)</strong>, <strong>QuickPress Partner</strong>, and <strong>QuickPress Captain</strong> in a unified, synchronized platform.
        </p>

        {/* 3 Authentic Panels Switcher Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mt-10">
          {PANELS_DATA.map((p) => {
            const isSelected = activePanelTab === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setActivePanelTab(p.id as any)}
                className={`p-4 rounded-3xl border-2 transition-all cursor-pointer flex items-center gap-4 text-left ${
                  isSelected
                    ? "bg-white border-gray-900 shadow-2xl scale-105 ring-4 ring-emerald-500/10"
                    : "bg-gray-50 border-gray-200 hover:bg-white hover:border-gray-300"
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl p-1.5 flex items-center justify-center shrink-0 border border-gray-100 shadow-xs ${p.logoBg}`}>
                  <img src={p.logoImg} alt={p.name} className="w-full h-full object-contain rounded-xl" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                    {p.badge}
                  </span>
                  <span className="text-base font-black text-gray-950 block">
                    {p.name}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── Active Panel Interactive Showcase ───────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-2xl p-8 sm:p-14 animate-fade-in grid lg:grid-cols-12 gap-10 items-center">
          {/* Left Details */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-4">
              <div className={`w-20 h-20 rounded-2xl p-2 flex items-center justify-center shrink-0 border border-gray-200 shadow-md ${currentPanel.logoBg}`}>
                <img src={currentPanel.logoImg} alt={currentPanel.name} className="w-full h-full object-contain rounded-xl" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-emerald-800">
                  {currentPanel.badgeLabel}
                </span>
                <h3 className="text-2xl sm:text-4xl font-black text-gray-950 mt-0.5">
                  {currentPanel.name}
                </h3>
              </div>
            </div>

            <p className="text-sm sm:text-base font-bold text-gray-900 leading-snug">
              {currentPanel.tagline}
            </p>

            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              {currentPanel.description}
            </p>

            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
                Core Capabilities & Workflow:
              </span>
              <ul className="space-y-2.5 text-xs sm:text-sm text-gray-700">
                {currentPanel.capabilities.map((cap) => (
                  <li key={cap} className="flex items-start gap-2.5">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0 mt-0.5"
                      style={{ background: currentPanel.accentColor }}
                    >
                      <IconCheck className="w-3 h-3" />
                    </span>
                    <span>{cap}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 flex flex-wrap gap-4">
              <button
                onClick={() => handlePanelAction(currentPanel.id)}
                className="px-8 py-3.5 rounded-full font-black text-white text-xs sm:text-sm shadow-md hover:scale-105 transition-all cursor-pointer flex items-center gap-2"
                style={{ background: currentPanel.accentColor }}
              >
                <span>{currentPanel.mockPreview.actionText} →</span>
              </button>
            </div>
          </div>

          {/* Right Simulated Panel Live Console */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm bg-white text-gray-950 rounded-3xl p-6 sm:p-7 shadow-xl border border-emerald-200/80 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-live-dot" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Live Panel Telemetry
                  </span>
                </div>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200">
                  Sub-100ms Sync
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-gray-200/80 space-y-3">
                <div className="w-12 h-12 rounded-xl p-1 bg-white border border-gray-100 shadow-xs flex items-center justify-center">
                  <img src={currentPanel.logoImg} alt={currentPanel.name} className="w-full h-full object-contain" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                    {currentPanel.mockPreview.screenTitle}
                  </span>
                  <h4 className="text-base font-black text-gray-950">
                    {currentPanel.mockPreview.orderId}
                  </h4>
                  <p className="text-xs text-gray-600 font-medium">
                    {currentPanel.mockPreview.status}
                  </p>
                </div>
                <div className="pt-2 border-t border-gray-200 text-[11px] text-gray-500 font-semibold">
                  {currentPanel.mockPreview.items}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                <span className="text-emerald-800 font-bold">Network State:</span>
                <span className="text-emerald-950 font-black flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  100% Operational
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── "WE ARE LIVE!" Real Admin Panel Coverage ─────────────────────────── */}
      <section id="coverage" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-live-dot" />
            Live Network Territory • Admin Panel Synced
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-gray-950 mt-3">
            We Are Live Across Your City
          </h2>
          <p className="text-gray-600 text-sm sm:text-base mt-2">
            Real operational states, operating city hubs, verified postal codes, and neighborhood delivery sectors active on the QuickPress network.
          </p>

          {/* Quick Metrics KPI Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <div className="p-3.5 bg-white border border-gray-200 rounded-2xl shadow-xs">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Active States</span>
              <span className="text-sm sm:text-base font-black text-emerald-800">2 States (UP & Delhi)</span>
            </div>
            <div className="p-3.5 bg-white border border-gray-200 rounded-2xl shadow-xs">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Operational Cities</span>
              <span className="text-sm sm:text-base font-black text-emerald-800">7 Regional Hubs</span>
            </div>
            <div className="p-3.5 bg-white border border-gray-200 rounded-2xl shadow-xs">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Serviceable Pincodes</span>
              <span className="text-sm sm:text-base font-black text-emerald-800">25+ Postal Codes</span>
            </div>
            <div className="p-3.5 bg-white border border-gray-200 rounded-2xl shadow-xs">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Active Fleet</span>
              <span className="text-sm sm:text-base font-black text-emerald-800">280+ Captains</span>
            </div>
          </div>
        </div>

        {/* Live Search & Filter Bar */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-emerald-100 shadow-xl mb-10 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* State Filter Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-gray-500 mr-1">Filter State:</span>
              {availableStates.map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedState(st)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedState === st
                      ? "bg-emerald-700 text-white shadow-md scale-105"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Pincode & Sector Instant Search Box */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchPincode}
                onChange={(e) => setSearchPincode(e.target.value)}
                placeholder="Enter 6-digit Pincode (e.g. 207123, 201301, 110001) or Sector..."
                className="w-full h-11 pl-10 pr-10 rounded-xl bg-gray-50 border border-gray-300 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all shadow-xs font-medium"
              />
              <IconSearch className="w-4 h-4 text-emerald-700 absolute left-3.5 top-1/2 -translate-y-1/2" />
              {searchPincode && (
                <button
                  onClick={() => setSearchPincode("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-700 font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Instant Verification Banner if search is active */}
          {searchedMatch && (
            <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-600 animate-live-dot shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm font-black text-emerald-950">
                    🟢 QuickPress is 100% LIVE in {searchedMatch.city.city} ({searchedMatch.city.state}) for PIN: {searchedMatch.matchedPin}!
                  </p>
                  <p className="text-xs text-emerald-800 font-medium">
                    {searchedMatch.sector.name} · Doorstep Pickup ETA: <strong>{searchedMatch.sector.eta}</strong> · {searchedMatch.city.hubs} Ready
                  </p>
                </div>
              </div>
              <button
                onClick={() => onOpenModal("booking")}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black transition-all cursor-pointer shadow-sm shrink-0"
              >
                Book Instant Pickup →
              </button>
            </div>
          )}

          {searchPincode.trim().length >= 6 && !searchedMatch && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between animate-fade-in">
              <span>
                📍 Pincode <strong>"{searchPincode}"</strong> is scheduled in our upcoming expansion rollout. Contact our team to vote for priority activation.
              </span>
              <button
                onClick={() => onOpenModal("contact")}
                className="text-xs font-bold underline hover:text-amber-950 cursor-pointer ml-2 shrink-0"
              >
                Request Expansion
              </button>
            </div>
          )}
        </div>

        {/* City Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {filteredCities.map((city) => {
            const isExpanded = expandedCityIds.includes(city.id);
            return (
              <div
                key={city.id}
                className="rounded-3xl p-7 border-2 border-gray-200 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all bg-white flex flex-col justify-between"
              >
                <div>
                  {/* Top Status & Tier */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-black text-sm border border-emerald-200 shadow-xs">
                      {city.city.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                        {city.tier}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-live-dot" />
                        {city.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between mb-1">
                    <h3 className="text-2xl font-black text-gray-950">{city.city}</h3>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md">
                      {city.state}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium mb-4">{city.tagline}</p>

                  {/* Operational Pincodes Pills */}
                  <div className="mb-4">
                    <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider block mb-1.5">
                      Serviceable Pincodes ({city.pincodes.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {city.pincodes.map((pin) => (
                        <span
                          key={pin}
                          className="px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-[11px] font-mono font-bold text-gray-800"
                        >
                          {pin}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Key Operational Metrics */}
                  <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Avg Pickup ETA</span>
                      <span className="text-sm font-black text-emerald-700">{city.avgPickup}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Active Fleet</span>
                      <span className="text-sm font-black text-gray-900">{city.captains}</span>
                    </div>
                  </div>

                  <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-gray-100 flex items-center justify-between text-[11px] text-gray-600 font-medium">
                    <span>Partner Stores: <strong>{city.hubs}</strong></span>
                    <span>Radius: <strong>{city.deliveryRadius}</strong></span>
                  </div>
                </div>

                {/* Tap to Open Sectors List Accordion Trigger */}
                <button
                  onClick={() => toggleCity(city.id)}
                  className="mt-5 pt-3 border-t border-gray-200 w-full flex items-center justify-between text-xs font-black text-emerald-800 hover:text-emerald-950 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {isExpanded ? "Hide Live Sectors List" : `Tap to view ${city.sectors.length} Live Sectors`}
                  </span>
                  <IconChevronDown
                    className={`w-4 h-4 transition-transform duration-300 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Expanded Sectors List */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-2 animate-fade-in">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                      Live Active Sectors ({city.sectors.length}):
                    </p>
                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                      {city.sectors.map((sec) => (
                        <div
                          key={sec.name}
                          className="p-2.5 rounded-xl bg-white border border-gray-200 flex items-center justify-between text-xs shadow-2xs hover:border-emerald-500 transition-colors"
                        >
                          <div>
                            <span className="font-bold text-gray-950 block text-[11px]">
                              {sec.name}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono font-medium">
                              PIN: {sec.pincode}
                            </span>
                          </div>
                          <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 shrink-0">
                            {sec.eta}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => onOpenModal("booking")}
                      className="mt-3 w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs transition-all shadow-sm cursor-pointer"
                    >
                      Book Doorstep Pickup in {city.city} →
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredCities.length === 0 && (
          <div className="text-center p-12 bg-white rounded-3xl border border-gray-200 shadow-sm mt-4">
            <p className="text-base font-bold text-gray-700">No operational city matched your search "{searchPincode}".</p>
            <button
              onClick={() => {
                setSelectedState("All States");
                setSearchPincode("");
              }}
              className="mt-3 px-5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold cursor-pointer"
            >
              Reset Filters & Show All Cities
            </button>
          </div>
        )}
      </section>

      {/* ─── Simulated Telemetry Dashboard Strip ───────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { value: "1,248", label: "Active Orders in Transit", sub: "Live geospatial tracking" },
            { value: "11.4 Min", label: "Avg Partner Match Latency", sub: "Dynamic automated routing" },
            { value: "99.8%", label: "Route Optimization Adherence", sub: "Zero lost packages" },
            { value: "100%", label: "System Operational Health", sub: "All regional hubs active" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl p-6 border border-gray-200/90 shadow-xs text-center"
            >
              <p className="text-3xl sm:text-4xl font-black" style={{ color: GREEN }}>
                {stat.value}
              </p>
              <p className="text-xs font-bold text-gray-900 mt-2">{stat.label}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Action Banner ────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 rounded-3xl p-8 sm:p-14 border border-emerald-200 shadow-md space-y-6">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-live-dot" />
            Connect With The Network
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-950">
            Experience the Live QuickPress Platform Today.
          </h2>
          <p className="text-gray-600 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Download our consumer mobile app for doorstep pickup, join our delivery fleet as a Captain, or apply to launch your exclusive franchise hub.
          </p>

          <div className="pt-2 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => {
                window.open("https://play.google.com/store/apps", "_blank");
                onOpenModal("download_app");
              }}
              className="px-8 py-3.5 rounded-full font-bold text-white text-sm shadow-md hover:scale-105 transition-all cursor-pointer flex items-center gap-2"
              style={{ background: GREEN }}
            >
              <IconSmartphone className="w-4 h-4" />
              <span>Get QuickPress App →</span>
            </button>
            <button
              onClick={() => onNavigate("partners")}
              className="px-8 py-3.5 rounded-full font-bold text-gray-950 text-sm shadow-md hover:scale-105 transition-all cursor-pointer"
              style={{ background: YELLOW }}
            >
              Launch a Partner Hub →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
