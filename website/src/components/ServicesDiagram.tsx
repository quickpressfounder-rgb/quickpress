import React, { useState } from "react";
import { ModalType } from "@/types";
import {
  IconCheck,
  IconClose,
  IconLaundry,
  IconBox,
  IconBriefcase,
  IconShield,
  IconArrowRight,
  IconGooglePlay,
  IconSparkles,
  IconShirt,
  IconTie,
  IconIron,
  IconFootprints,
  IconHome,
  IconBag,
  IconBuilding,
  IconCpu,
  IconVan,
  IconBolt,
  IconSparkle,
} from "@/components/Icons";

const GREEN = "#1A7A3C";

export interface PremiumServiceItem {
  id: string;
  name: string;
  category: string;
  time: string;
  price: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accentColor: string;
  bgLight: string;
}

export interface CategoryConfig {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  chamberName: string;
  chamberTemp: string;
  chamberChem: string;
  turnaroundSLA: string;
  metricBadge: string;
}

const CATEGORY_CONFIGS: CategoryConfig[] = [
  {
    key: "all",
    label: "All Services",
    icon: IconSparkles,
    color: GREEN,
    chamberName: "Precision Multi-Chamber Plant",
    chamberTemp: "30°C - 60°C Adaptive Control",
    chamberChem: "Eco-Enzymes & Hydrocarbon",
    turnaroundSLA: "24h - 48h Guaranteed",
    metricBadge: "Full Care Suite",
  },
  {
    key: "wash-fold",
    label: "Wash & Fold",
    icon: IconShirt,
    color: "#059669",
    chamberName: "Botanical Soft-Drum Washers",
    chamberTemp: "30°C Cold Drum Gentle Cycle",
    chamberChem: "0% Harsh Bleach • Botanical Soap",
    turnaroundSLA: "24h Doorstep Return",
    metricBadge: "100% Skin Safe",
  },
  {
    key: "dry-clean",
    label: "Dry Cleaning",
    icon: IconTie,
    color: "#2563EB",
    chamberName: "Hydrocarbon Solvent Chamber",
    chamberTemp: "Zero-Water Dry Immersion",
    chamberChem: "Perc-Free Gentle Hydrocarbon",
    turnaroundSLA: "48h Master Delivery",
    metricBadge: "Zero Fiber Stress",
  },
  {
    key: "steam-press",
    label: "Steam Pressing",
    icon: IconIron,
    color: "#D97706",
    chamberName: "Italian Vacuum Steam Tables",
    chamberTemp: "140°C High-Pressure Micro-Steam",
    chamberChem: "Zero Scorch • Crisp Starch Option",
    turnaroundSLA: "Same-Day / 24h SLA",
    metricBadge: "Razor Creases",
  },
  {
    key: "shoe-spa",
    label: "Shoe & Sneaker",
    icon: IconFootprints,
    color: "#7C3AED",
    chamberName: "Ultrasonic & Ozone Chamber",
    chamberTemp: "Low-Thermal Gentle Dehumidify",
    chamberChem: "UV-C Ozone Deodorization",
    turnaroundSLA: "48h - 72h Hand Restoration",
    metricBadge: "Ozone Sterilized",
  },
  {
    key: "home-linens",
    label: "Home & Quilts",
    icon: IconHome,
    color: "#0D9488",
    chamberName: "25kg Industrial Linen Drums",
    chamberTemp: "60°C Anti-Dustmite Thermal Sanitization",
    chamberChem: "Deep Fabric Allergen Neutralizer",
    turnaroundSLA: "48h Plush Return",
    metricBadge: "Anti-Dustmite",
  },
  {
    key: "bag-leather",
    label: "Leather & Bags",
    icon: IconBag,
    color: "#92400E",
    chamberName: "Artisanal Conditioning Studio",
    chamberTemp: "Controlled Humidity Drying",
    chamberChem: "Carnauba Wax & Beeswax Balm",
    turnaroundSLA: "48h White-Glove Handover",
    metricBadge: "Original Luster",
  },
  {
    key: "enterprise",
    label: "B2B Bulk",
    icon: IconBuilding,
    color: "#4338CA",
    chamberName: "Commercial Industrial Lines",
    chamberTemp: "High-Volume Calibrated Cycle",
    chamberChem: "Commercial Disinfection Grade",
    turnaroundSLA: "Daily Scheduled Slots",
    metricBadge: "Dedicated Fleet",
  },
];

const SERVICES_DATA: PremiumServiceItem[] = [
  // Wash & Fold
  {
    id: "wf-wash-fold",
    name: "Wash, Dry & Crisp Fold",
    category: "wash-fold",
    time: "24h Return",
    price: "From ₹49/kg",
    icon: IconShirt,
    accentColor: "#059669",
    bgLight: "#ECFDF5",
  },
  {
    id: "wf-wash-iron",
    name: "Wash & Steam Iron Combo",
    category: "wash-fold",
    time: "24-48h Return",
    price: "From ₹79/pc",
    icon: IconShirt,
    accentColor: "#059669",
    bgLight: "#ECFDF5",
  },
  {
    id: "wf-baby-care",
    name: "Baby & Sensitive Care",
    category: "wash-fold",
    time: "24h Return",
    price: "From ₹59/pc",
    icon: IconSparkles,
    accentColor: "#059669",
    bgLight: "#ECFDF5",
  },
  {
    id: "wf-bedsheets-towels",
    name: "Bedsheets & Towels",
    category: "wash-fold",
    time: "24-48h Return",
    price: "From ₹89/pc",
    icon: IconHome,
    accentColor: "#0D9488",
    bgLight: "#F0FDFA",
  },

  // Dry Cleaning
  {
    id: "dc-suits-blazers",
    name: "Suits, Blazers & Tuxedos",
    category: "dry-clean",
    time: "48h Return",
    price: "From ₹249/pc",
    icon: IconTie,
    accentColor: "#2563EB",
    bgLight: "#EFF6FF",
  },
  {
    id: "dc-silk-sarees",
    name: "Silk Sarees & Lehengas",
    category: "dry-clean",
    time: "48h Return",
    price: "From ₹199/pc",
    icon: IconSparkles,
    accentColor: "#7C3AED",
    bgLight: "#F5F3FF",
  },
  {
    id: "dc-sherwani-ethnic",
    name: "Sherwanis & Bandhgalas",
    category: "dry-clean",
    time: "48h Return",
    price: "From ₹299/pc",
    icon: IconTie,
    accentColor: "#D97706",
    bgLight: "#FEF3C7",
  },
  {
    id: "dc-woolens-coats",
    name: "Woolens & Trench Coats",
    category: "dry-clean",
    time: "48h Return",
    price: "From ₹189/pc",
    icon: IconShirt,
    accentColor: "#2563EB",
    bgLight: "#EFF6FF",
  },

  // Steam Pressing
  {
    id: "sp-formal-wear",
    name: "Formal Shirts & Trousers",
    category: "steam-press",
    time: "Same-Day / 24h",
    price: "From ₹29/pc",
    icon: IconIron,
    accentColor: "#D97706",
    bgLight: "#FFFBEB",
  },
  {
    id: "sp-ethnic-kurtas",
    name: "Kurtas & Cotton Sarees",
    category: "steam-press",
    time: "Same-Day / 24h",
    price: "From ₹39/pc",
    icon: IconIron,
    accentColor: "#D97706",
    bgLight: "#FFFBEB",
  },

  // Shoe Spa
  {
    id: "ss-sneaker-spa",
    name: "Sneakers & Sports Shoes",
    category: "shoe-spa",
    time: "48h Return",
    price: "From ₹199/pair",
    icon: IconFootprints,
    accentColor: "#7C3AED",
    bgLight: "#F5F3FF",
  },
  {
    id: "ss-leather-boots",
    name: "Leather Boots & Formal Shoes",
    category: "shoe-spa",
    time: "48h Return",
    price: "From ₹249/pair",
    icon: IconFootprints,
    accentColor: "#7C3AED",
    bgLight: "#F5F3FF",
  },

  // Home Linens
  {
    id: "hl-quilts-blankets",
    name: "Blankets, Quilts & Razai",
    category: "home-linens",
    time: "48h Return",
    price: "From ₹249/pc",
    icon: IconHome,
    accentColor: "#0D9488",
    bgLight: "#F0FDFA",
  },
  {
    id: "hl-curtains-drapes",
    name: "Curtains & Window Drapes",
    category: "home-linens",
    time: "48h Return",
    price: "From ₹149/panel",
    icon: IconHome,
    accentColor: "#0D9488",
    bgLight: "#F0FDFA",
  },

  // Bag & Leather
  {
    id: "bl-jackets-coats",
    name: "Leather Jackets & Suede",
    category: "bag-leather",
    time: "48-72h Return",
    price: "From ₹399/pc",
    icon: IconBag,
    accentColor: "#92400E",
    bgLight: "#FEF3C7",
  },
  {
    id: "bl-handbags",
    name: "Luxury Handbags & Backpacks",
    category: "bag-leather",
    time: "48h Return",
    price: "From ₹299/pc",
    icon: IconBag,
    accentColor: "#92400E",
    bgLight: "#FEF3C7",
  },

  // Enterprise
  {
    id: "ent-hotels-salons",
    name: "Hotels, Salons & Airbnbs",
    category: "enterprise",
    time: "Daily Slots",
    price: "Custom Contract",
    icon: IconBuilding,
    accentColor: "#4338CA",
    bgLight: "#EEF2FF",
  },
  {
    id: "ent-corporate-uniforms",
    name: "Corporate Uniforms Fleet",
    category: "enterprise",
    time: "Scheduled",
    price: "Volume Pricing",
    icon: IconBuilding,
    accentColor: "#4338CA",
    bgLight: "#EEF2FF",
  },
];

export function ServicesDiagramSection({
  onOpenModal,
  showTitle = true,
}: {
  onOpenModal: (type: ModalType) => void;
  showTitle?: boolean;
}) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [diagramMode, setDiagramMode] = useState<"flow" | "compare">("flow");
  const [searchQuery, setSearchQuery] = useState("");

  const PLAY_STORE_URL = "https://play.google.com/store/apps";

  const handleBookClick = () => {
    window.open(PLAY_STORE_URL, "_blank");
    onOpenModal("download_app");
  };

  const currentConfig =
    CATEGORY_CONFIGS.find((c) => c.key === activeCategory) || CATEGORY_CONFIGS[0];

  const filteredServices = SERVICES_DATA.filter((s) => {
    const matchesCat = activeCategory === "all" || s.category === activeCategory;
    const matchesSearch =
      searchQuery.trim() === "" ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const ChamberIcon = currentConfig.icon;

  return (
    <div className="w-full space-y-10 sm:space-y-14">
      {/* ─── Premium Header ──────────────────────────────────────────────── */}
      {showTitle && (
        <div className="text-center max-w-4xl mx-auto px-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-black uppercase tracking-widest mb-3 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-live-dot" />
            Specialized Care Architecture
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-gray-950 tracking-tight leading-tight">
            Premium Fabric Care.{" "}
            <span style={{ color: GREEN }}>Precision Engineering.</span>
          </h2>
          <p className="text-gray-500 text-sm sm:text-base mt-3 max-w-2xl mx-auto font-medium">
            Explore verified care chambers, turnaround guarantees, and schedule with one tap.
          </p>
        </div>
      )}

      {/* ─── Category Selection Tabs (Pure SVG Icons, Zero Emojis, No Scrollbar) ──────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
          {CATEGORY_CONFIGS.map((cfg) => {
            const isSelected = activeCategory === cfg.key;
            const IconComponent = cfg.icon;
            return (
              <button
                key={cfg.key}
                onClick={() => {
                  setActiveCategory(cfg.key);
                  setSearchQuery("");
                }}
                className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm font-black transition-all duration-200 cursor-pointer flex items-center gap-2.5 border ${
                  isSelected
                    ? "bg-emerald-700 text-white border-emerald-700 shadow-xl shadow-emerald-900/15 ring-2 ring-emerald-500/80"
                    : "bg-white text-gray-700 border-gray-200/90 hover:bg-gray-50 hover:border-gray-300 shadow-2xs"
                }`}
              >
                <IconComponent
                  className={`w-4 h-4 shrink-0 ${isSelected ? "text-emerald-400" : "text-gray-500"}`}
                />
                <span className="whitespace-nowrap">{cfg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Master Visual Diagram (Bada, Imposing & Highly Attractive) ────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-3xl sm:rounded-[36px] p-6 sm:p-10 border border-emerald-100 shadow-2xl shadow-emerald-950/5 relative overflow-hidden">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-100/40 via-emerald-50/20 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

          {/* Diagram Control Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-gray-100 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-live-dot" />
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-900 block">
                  LIVE OPERATIONS DIAGRAM
                </span>
                <span className="text-sm font-black text-gray-900">
                  Target: <span style={{ color: currentConfig.color }}>{currentConfig.label}</span>
                </span>
              </div>
            </div>

            {/* View Switcher: Diagram vs Comparison */}
            <div className="inline-flex rounded-2xl bg-gray-100/90 p-1.5 border border-gray-200 text-xs font-bold">
              <button
                onClick={() => setDiagramMode("flow")}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer font-black ${
                  diagramMode === "flow"
                    ? "bg-white text-gray-950 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Care Flowchart
              </button>
              <button
                onClick={() => setDiagramMode("compare")}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer font-black ${
                  diagramMode === "compare"
                    ? "bg-white text-gray-950 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Why Us vs Local Dhobi
              </button>
            </div>
          </div>

          {/* DIAGRAM MODE 1: Large, Imposing Flowchart */}
          {diagramMode === "flow" && (
            <div className="space-y-8">
              {/* 4 Connected Large Nodes */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 relative">
                {/* Node 1: Doorstep Pickup */}
                <div className="bg-slate-50/90 rounded-3xl p-6 border border-gray-200/90 hover:border-emerald-500 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-black tracking-widest px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900">
                        STAGE 01
                      </span>
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        GPS Van Dispatch
                      </span>
                    </div>

                    <div className="w-14 h-14 rounded-2xl bg-emerald-100/80 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                      <IconVan className="w-7 h-7 text-emerald-800" />
                    </div>

                    <h4 className="text-base font-black text-gray-950 mb-1">
                      Doorstep Intake & Tag
                    </h4>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                      Barcode QR scan, fabric integrity check, and tamper-proof weather bag sealing.
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-gray-200/60 flex items-center justify-between text-xs font-semibold text-gray-500">
                    <span>Courier ETA</span>
                    <span className="text-emerald-700 font-black">&lt;12 Mins</span>
                  </div>
                </div>

                {/* Node 2: Dynamic Chamber Care */}
                <div
                  className="rounded-3xl p-6 border-2 transition-all duration-300 flex flex-col justify-between shadow-lg group relative overflow-hidden"
                  style={{
                    backgroundColor: `${currentConfig.color}0A`,
                    borderColor: currentConfig.color,
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className="text-xs font-black tracking-widest px-2.5 py-1 rounded-lg text-white"
                        style={{ backgroundColor: currentConfig.color }}
                      >
                        STAGE 02
                      </span>
                      <span
                        className="text-[10px] font-extrabold px-2.5 py-1 rounded-full border"
                        style={{
                          backgroundColor: `${currentConfig.color}15`,
                          color: currentConfig.color,
                          borderColor: `${currentConfig.color}40`,
                        }}
                      >
                        {currentConfig.metricBadge}
                      </span>
                    </div>

                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-xs"
                      style={{ backgroundColor: `${currentConfig.color}20` }}
                    >
                      <ChamberIcon className="w-7 h-7" style={{ color: currentConfig.color }} />
                    </div>

                    <h4 className="text-base font-black text-gray-950 mb-1">
                      {currentConfig.chamberName}
                    </h4>
                    <p className="text-xs text-gray-700 font-semibold leading-relaxed">
                      {currentConfig.chamberTemp} <br />
                      <span className="text-gray-500 font-normal">{currentConfig.chamberChem}</span>
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-gray-200/60 flex items-center justify-between text-xs font-semibold text-gray-600">
                    <span>Care Chamber</span>
                    <span className="font-black" style={{ color: currentConfig.color }}>
                      Optimal
                    </span>
                  </div>
                </div>

                {/* Node 3: Sensor & Optical QA */}
                <div className="bg-slate-50/90 rounded-3xl p-6 border border-gray-200/90 hover:border-blue-500 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-black tracking-widest px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900">
                        STAGE 03
                      </span>
                      <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                        6-Point Optical QA
                      </span>
                    </div>

                    <div className="w-14 h-14 rounded-2xl bg-blue-100/80 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                      <IconShield className="w-7 h-7 text-blue-700" />
                    </div>

                    <h4 className="text-base font-black text-gray-950 mb-1">
                      Quality & Freshness Gate
                    </h4>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                      Stain elimination audit, zero-shine crease verification, and button inspection.
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-gray-200/60 flex items-center justify-between text-xs font-semibold text-gray-500">
                    <span>Audit Status</span>
                    <span className="text-blue-700 font-black">100% Certified</span>
                  </div>
                </div>

                {/* Node 4: Express Sealed Delivery */}
                <div className="bg-white text-gray-950 rounded-3xl p-6 shadow-xl border-2 border-emerald-600 flex flex-col justify-between relative group">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-black tracking-widest px-2.5 py-1 rounded-lg bg-emerald-600 text-white">
                        STAGE 04
                      </span>
                      <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        {currentConfig.turnaroundSLA}
                      </span>
                    </div>

                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                      <IconCheck className="w-7 h-7 text-emerald-700" />
                    </div>

                    <h4 className="text-base font-black text-gray-950 mb-1">
                      Tamper-Proof Handover
                    </h4>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                      Sealed recyclable dust cover, OTP verification, and doorstep return on time.
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-500">
                    <span>On-Time SLA</span>
                    <span className="text-emerald-700 font-black">99.8% Guaranteed</span>
                  </div>
                </div>
              </div>

              {/* Diagram Telemetry Specs Strip */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-gray-200/90 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-5 sm:gap-8 text-xs font-bold text-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span><strong>Turnaround:</strong> {currentConfig.turnaroundSLA}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span><strong>Chemistry:</strong> {currentConfig.chamberChem}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span><strong>Thermal:</strong> {currentConfig.chamberTemp}</span>
                  </div>
                </div>

                <button
                  onClick={handleBookClick}
                  className="px-6 py-2.5 rounded-xl font-black text-white text-xs shadow-md hover:shadow-lg hover:scale-102 active:scale-95 transition-all cursor-pointer flex items-center gap-2 ml-auto"
                  style={{ background: GREEN }}
                >
                  <IconGooglePlay className="w-4 h-4 text-emerald-300" />
                  <span>Book on QuickPress App →</span>
                </button>
              </div>
            </div>
          )}

          {/* DIAGRAM MODE 2: Comparison Matrix (Clean, Crisp, Zero Emojis) */}
          {diagramMode === "compare" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Traditional Dhobi */}
              <div className="bg-red-50/50 rounded-3xl p-6 sm:p-8 border border-red-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-black text-red-950 flex items-center gap-2">
                    <IconClose className="w-4 h-4 text-red-600" />
                    Traditional Dhobi / Local Shop
                  </h4>
                  <span className="text-xs font-black bg-red-100 text-red-800 px-3 py-1 rounded-full">
                    High Risk
                  </span>
                </div>
                <ul className="space-y-3 text-xs sm:text-sm text-red-900/80 font-medium">
                  <li className="flex items-start gap-2.5">
                    <span className="text-red-500 font-bold">•</span>
                    <span>Rough manual stone beating damages stitching, cuffs and delicate seams.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-red-500 font-bold">•</span>
                    <span>Harsh open sun drying triggers color fading, fabric shrinkage and stiffness.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-red-500 font-bold">•</span>
                    <span>Heavy coal irons cause scorch marks, shiny patches and fabric burns.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-red-500 font-bold">•</span>
                    <span>Zero tracking with frequent lost garments and mixed-customer washes.</span>
                  </li>
                </ul>
              </div>

              {/* QuickPress Tech Care */}
              <div className="bg-emerald-50/60 rounded-3xl p-6 sm:p-8 border border-emerald-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-black text-emerald-950 flex items-center gap-2">
                    <IconCheck className="w-4 h-4 text-emerald-600" />
                    QuickPress Tech Fabric Care
                  </h4>
                  <span className="text-xs font-black bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full">
                    Verified Quality
                  </span>
                </div>
                <ul className="space-y-3 text-xs sm:text-sm text-emerald-950 font-medium">
                  <li className="flex items-start gap-2.5">
                    <IconCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Computer-calibrated inverter drum wash with hypoallergenic botanical formulas.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <IconCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Gentle low-heat sanitized moisture extraction retains vibrant fabric luster.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <IconCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Italian 140°C vacuum steam tables give razor creases with 0% scorch.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <IconCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>100% serialized barcode QR bag seal with zero lost items and 24h SLA.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Minimal Search Strip ────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <input
            type="text"
            placeholder="Search service name (e.g. Saree, Suit, Sneaker, Quilt)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-3 rounded-2xl bg-white border border-gray-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-500/10 shadow-xs transition-all"
          />
          <svg
            className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
            >
              <IconClose className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs font-bold text-gray-500 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-xs">
            Showing <strong className="text-gray-950 font-black">{filteredServices.length}</strong> Services
          </span>
          <button
            onClick={handleBookClick}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-sm"
          >
            <IconGooglePlay className="w-3.5 h-3.5 text-emerald-400" />
            <span>Open Play Store</span>
          </button>
        </div>
      </div>

      {/* ─── Premium BADA BADA Cards Grid (Service Names Only, Minimal & Attractive) ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {filteredServices.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 max-w-md mx-auto shadow-sm">
            <p className="text-gray-500 text-sm font-bold mb-3">No services found for "{searchQuery}"</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("all");
              }}
              className="px-5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {filteredServices.map((item) => {
              const ServiceIcon = item.icon;

              return (
                <div
                  key={item.id}
                  onClick={handleBookClick}
                  className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/90 shadow-sm hover:shadow-2xl hover:border-emerald-500/50 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group cursor-pointer relative overflow-hidden"
                >
                  {/* Top Ambient Glow Line */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1.5 opacity-80 group-hover:opacity-100 transition-opacity"
                    style={{ background: item.accentColor }}
                  />

                  {/* Top Section: Icon & Pills */}
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-6">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 group-hover:rotate-1 transition-all duration-300"
                        style={{ background: item.bgLight }}
                      >
                        <ServiceIcon className="w-7 h-7" style={{ color: item.accentColor }} />
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-xs font-black text-gray-950 bg-gray-100 px-3 py-1 rounded-xl shadow-2xs">
                          {item.price}
                        </span>
                        <span className="text-[11px] font-black text-emerald-900 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-lg">
                          {item.time}
                        </span>
                      </div>
                    </div>

                    {/* ONLY SERVICE NAME (Large, Bold, High-End) */}
                    <h3 className="text-lg sm:text-xl font-black text-gray-950 tracking-tight leading-snug group-hover:text-emerald-700 transition-colors">
                      {item.name}
                    </h3>
                  </div>

                  {/* Bottom Action Strip */}
                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400 group-hover:text-emerald-700 transition-colors">
                      Tap to Book on App
                    </span>

                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs group-hover:scale-110 group-hover:shadow-md transition-all duration-300"
                      style={{ background: item.accentColor }}
                    >
                      <IconArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Bottom Executive Guarantee Banner ────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-white text-gray-950 rounded-3xl p-6 sm:p-8 flex flex-wrap items-center justify-between gap-6 shadow-xl border-2 border-emerald-200">
          <div className="flex flex-wrap items-center gap-6 sm:gap-10 text-xs sm:text-sm font-black text-gray-800">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-live-dot" />
              99.8% On-Time SLA
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              100% Barcode QR Sealed
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              0% Harsh Chemicals
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Guaranteed &lt;24h Return
            </span>
          </div>

          <button
            onClick={handleBookClick}
            className="px-6 py-3 rounded-2xl font-black text-white bg-emerald-700 hover:bg-emerald-800 text-xs sm:text-sm shadow-md hover:scale-102 active:scale-95 transition-all cursor-pointer flex items-center gap-2 ml-auto sm:ml-0"
          >
            <IconGooglePlay className="w-4 h-4 text-emerald-300" />
            <span>Schedule Doorstep Pickup</span>
          </button>
        </div>
      </div>
    </div>
  );
}
