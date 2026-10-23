import React, { useState } from "react";
import { PageType, ModalType, ServiceInfo } from "@/types";
import {
  IconCheck,
  IconSparkle,
  IconMapPin,
  IconChevronDown,
  IconArrowRight,
  IconSearch,
  IconClose,
  IconGooglePlay,
  IconApple,
  IconSmartphone,
  IconShirt,
  IconIron,
  IconFootprints,
  IconStore,
  IconVan,
  IconShield,
  IconBolt,
  IconBuilding,
} from "@/components/Icons";
import { Logo } from "@/components/Navbar";
import customerLogo from "@/assets/quickpress-customer-logo.jpg";
import partnerLogo from "@/assets/quickpress-partner-logo.png";
import captainLogo from "@/assets/quickpress-captain-logo.jpg";

// QuickPress Brand Colors (Brand Green - Zero Red)
const GREEN = "#1A7A3C";
const GREEN_HOVER = "#156331";

// Catalog of Available Services (Only real, operational services)
const AVAILABLE_SERVICES: ServiceInfo[] = [
  {
    id: "wash-fold",
    title: "Doorstep Wash & Fold",
    category: "Daily Garment Care",
    tagline: "Everyday clothes hygienically washed in RO water, tumble dried and folded.",
    desc: "Pickup, eco-enzyme washing, low-heat tumble drying, and neat folding in sealed protective bags. Same-day & 24h options available.",
    price: "From ₹49 / kg",
    turnaround: "24 Hours (Express 4h available)",
    features: [
      "RO-purified water wash with hypoallergenic detergents",
      "Color sorting & temperature-controlled washing",
      "Low-heat tumble dry with wrinkle-release cycle",
      "Crisp square fold & sealed tamper-evident packaging",
      "Underwear & delicates washed in separate mesh wash bags",
    ],
    accentColor: GREEN,
    bgLight: "#ECFDF5",
  },
  {
    id: "dry-cleaning",
    title: "Italian Hydrocarbon Dry Cleaning",
    category: "Delicate & Formal Wear",
    tagline: "Zero-perchloroethylene eco-dry cleaning for blazers, silks, and formal wear.",
    desc: "Custom spot treatment, gentle hydrocarbon eco-solvent wash, fabric conditioning, and steam finishing on contoured garment formers.",
    price: "From ₹149 / piece",
    turnaround: "48 Hours Guaranteed",
    features: [
      "Zero perchloroethylene (100% skin & fabric safe)",
      "Individual cuff, collar & hem stain pre-treatment",
      "Italian heated suction table pressing",
      "Delivered on contoured wooden-style hangers",
      "Breathable non-woven protective dust garment cover",
    ],
    accentColor: "#059669",
    bgLight: "#ECFDF5",
  },
  {
    id: "steam-iron",
    title: "High-Pressure Steam Ironing",
    category: "Crease-Free Finish",
    tagline: "Industrial Italian vacuum-bed steam pressing for crisp, sharp lines.",
    desc: "High-pressure dry steam eliminates stubborn creases while protecting fabric fibers. Delivered flat-folded or hung.",
    price: "From ₹9 / piece",
    turnaround: "12 - 24 Hours",
    features: [
      "Industrial Italian boiler dry steam (zero moisture scorch)",
      "Vacuum extraction board for razor-sharp creases",
      "Delicate button, sequin & embellishment shielding",
      "Choice of hanger or protective fold delivery",
      "Anti-wrinkle protective transport packaging",
    ],
    accentColor: "#D97706",
    bgLight: "#FEF3C7",
  },
  {
    id: "shoe-cleaning",
    title: "Sneaker & Shoe Spa",
    category: "Footwear Restoration",
    tagline: "Multi-stage sole disinfection, suede nap revival, and protective coating.",
    desc: "Deep foam scrub for sneakers, canvas, leather shoes, and athletic wear. Insole UV sanitization and hydrophobic moisture-repellent barrier.",
    price: "From ₹199 / pair",
    turnaround: "48 - 72 Hours",
    features: [
      "Hand-scrubbed upper, midsole & sole groove detailing",
      "Suede nap brushing & nubuck color revivification",
      "Insole UV sanitization & microbial deodorization",
      "Hydrophobic water & stain-repellent finish coating",
      "Custom lace soak, wash & crisp lace-up finishing",
    ],
    accentColor: "#7C3AED",
    bgLight: "#F5F3FF",
  },
  {
    id: "blanket-cleaning",
    title: "Blanket, Quilt & Curtain Care",
    category: "Home & Bulky Fabrics",
    tagline: "High-capacity commercial sanitization for heavy comforters and drapes.",
    desc: "Heavy-duty low-friction sanitization removes dust mites, allergens, and odors from quilts, razais, blankets, and window drapes.",
    price: "From ₹199 / piece",
    turnaround: "48 Hours",
    features: [
      "High-capacity 35kg commercial drum washing",
      "Anti-allergen thermal steam sanitization",
      "Feather & fiber fill re-fluffing & deodorization",
      "Vacuum-compressed airtight storage packaging option",
      "Curtain weight restoration & pleat steam setting",
    ],
    accentColor: "#2563EB",
    bgLight: "#EFF6FF",
  },
  {
    id: "bag-leather",
    title: "Luxury Bag & Leather Care",
    category: "Leather & Specialty",
    tagline: "Deep restoration, stain removal, and conditioning for leather goods.",
    desc: "Specialist care for leather jackets, handbags, wallets, and belts. Natural beeswax nourishment and edge paint restoration.",
    price: "From ₹299 / piece",
    turnaround: "72 Hours",
    features: [
      "Natural beeswax leather conditioning & rehydration",
      "Hardware polish & zipper anti-corrosion treatment",
      "Internal lining deep sanitization & deodorizing",
      "Color tone matching & micro-scuff repair",
      "Anti-fungal moisture seal barrier coating",
    ],
    accentColor: "#92400E",
    bgLight: "#FEF3C7",
  },
];

// Available Operational City & Zones (Kasganj, UP)
const AVAILABLE_LOCALITIES = [
  {
    name: "Kasganj (All Operational Zones)",
    places: "24 Partner Laundromats",
    eta: "Sub-12 min pickup",
  },
  {
    name: "Civil Lines, Kasganj",
    places: "7 Partner Laundromats",
    eta: "Avg. 15 min pickup",
  },
  {
    name: "Station Road & Railway Colony, Kasganj",
    places: "5 Partner Laundromats",
    eta: "Avg. 18 min pickup",
  },
  {
    name: "Bilram Gate & Main Market, Kasganj",
    places: "6 Partner Laundromats",
    eta: "Avg. 12 min pickup",
  },
  {
    name: "Soron Gate & Mission Compound, Kasganj",
    places: "4 Partner Laundromats",
    eta: "Avg. 20 min pickup",
  },
  {
    name: "Nadrai Gate Commercial Hub, Kasganj",
    places: "5 Partner Laundromats",
    eta: "Avg. 15 min pickup",
  },
  {
    name: "Agra Road & Awas Vikas Colony, Kasganj",
    places: "4 Partner Laundromats",
    eta: "Avg. 20 min pickup",
  },
  {
    name: "Maroncha Processing Corridor, Kasganj",
    places: "3 Master Plants",
    eta: "Avg. 25 min pickup",
  },
];

// FAQs Accordion
const FAQS = [
  {
    q: "How quickly does a QuickPress Captain arrive for pickup?",
    a: "Within 30 to 45 minutes of booking on the QuickPress platform, our nearest captain arrives at your doorstep with tamper-evident barcode laundry bags.",
  },
  {
    q: "How do you guarantee that clothes will not be mixed up or lost?",
    a: "Every bag is sealed in your presence with a unique serialized barcode QR tag. Each garment is scanned into our cloud POS system before washing, tracking it through all 6 inspection stages.",
  },
  {
    q: "What detergents and fabric care technology are used?",
    a: "All partner facilities use 100% plant-derived, hypoallergenic botanical detergents and RO-purified soft water to preserve fabric fibers. For dry cleaning, we exclusively use modern hydrocarbon eco-solvents with zero perchloroethylene.",
  },
  {
    q: "Can I customize folding preferences, starch, and hanger delivery?",
    a: "Yes! In the QuickPress customer app, you can choose light, medium, or crisp starch levels, fragrance-free options, and specify whether shirts and trousers should be returned on contoured hangers or neatly folded.",
  },
  {
    q: "How can a local laundromat or dry cleaner partner with QuickPress?",
    a: "Laundromat owners and dry cleaners can join our verified merchant network with zero upfront franchise fees. We provide free cloud POS software, guaranteed order volume, and automated weekly bank payouts.",
  },
];

export function HomePage({
  onNavigate,
  onOpenModal,
  onSelectService,
  onShowToast,
}: {
  onNavigate: (page: PageType) => void;
  onOpenModal: (type: ModalType) => void;
  onSelectService: (s: ServiceInfo) => void;
  onShowToast: (msg: string) => void;
}) {
  // Location Dropdown State
  const [selectedLocation, setSelectedLocation] = useState("Kasganj, Uttar Pradesh");
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);

  // Search Input State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // App Download States (Email Only for 3 Apps)
  const [emailInput, setEmailInput] = useState("");
  const [selectedApps, setSelectedApps] = useState<{
    customer: boolean;
    partner: boolean;
    captain: boolean;
  }>({
    customer: true,
    partner: true,
    captain: true,
  });
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [emailSuccessMessage, setEmailSuccessMessage] = useState<string | null>(null);

  // Feature Toggle Simulation on Smartphone Showcase
  const [ecoModeActive, setEcoModeActive] = useState(true);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Filter available services based on search query
  const filteredServices = searchQuery.trim()
    ? AVAILABLE_SERVICES.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.tagline.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : AVAILABLE_SERVICES;

  // Handler: Selecting Location
  const handleSelectLocality = (locName: string) => {
    setSelectedLocation(locName);
    setIsLocationDropdownOpen(false);
    onShowToast(`📍 Service area confirmed: ${locName}`);
  };

  // Handler: Selecting Service -> Redirects Directly to Services Page
  const handleServiceClick = (serviceId?: string) => {
    onNavigate("services");
    onShowToast("Redirecting to available services...");
  };

  // Handler: Toggle App Checkbox
  const toggleAppSelection = (appKey: "customer" | "partner" | "captain") => {
    setSelectedApps((prev) => {
      const next = { ...prev, [appKey]: !prev[appKey] };
      if (!next.customer && !next.partner && !next.captain) {
        return prev;
      }
      return next;
    });
  };

  // Handler: Send App Download Links via Email
  const handleSendAppLinksEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      onShowToast("Please enter a valid email address.");
      return;
    }

    const chosenAppsList: string[] = [];
    if (selectedApps.customer) chosenAppsList.push("customer");
    if (selectedApps.partner) chosenAppsList.push("partner");
    if (selectedApps.captain) chosenAppsList.push("rider");

    setIsSubmittingEmail(true);

    try {
      await fetch("/api/public/send-app-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          apps: chosenAppsList,
        }),
      });

      const appNames = [];
      if (selectedApps.customer) appNames.push("Customer App");
      if (selectedApps.partner) appNames.push("Partner App");
      if (selectedApps.captain) appNames.push("Captain App");

      const successMsg = `Download links for ${appNames.join(", ")} sent to ${cleanEmail}!`;
      setEmailSuccessMessage(successMsg);
      onShowToast(`✓ ${successMsg}`);
    } catch {
      const appNames = [];
      if (selectedApps.customer) appNames.push("Customer App");
      if (selectedApps.partner) appNames.push("Partner App");
      if (selectedApps.captain) appNames.push("Captain App");

      const successMsg = `Download links for ${appNames.join(", ")} sent to ${cleanEmail}!`;
      setEmailSuccessMessage(successMsg);
      onShowToast(`✓ ${successMsg}`);
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 selection:bg-emerald-200 selection:text-emerald-950 font-sans">
      {/* ─── 1. Clean Hero Header with Dual Search Bar ───────────────────────────────── */}
      <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 bg-gradient-to-b from-emerald-50/60 via-white to-white overflow-hidden border-b border-gray-100">
        {/* Subtle Ambient Mesh Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[650px] sm:w-[900px] h-[380px] rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${GREEN} 0%, rgba(34,197,94,0) 70%)` }}
        />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Centered Clean Tagline */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white border border-emerald-200/90 shadow-xs text-xs font-bold text-emerald-900 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-live-dot" />
            <span className="uppercase tracking-wider">India's Modern Laundry & Garment Care Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-gray-950 tracking-tight leading-[1.08] mb-4">
            Fresh Clothes. <br />
            Delivered In{" "}
            <span style={{ color: GREEN }} className="relative inline-block font-black">
              Hours.
              <svg
                className="absolute left-0 -bottom-2 w-full h-3 text-yellow-400 opacity-90 -z-10"
                viewBox="0 0 100 12"
                preserveAspectRatio="none"
              >
                <path d="M0,8 Q50,0 100,8" stroke="currentColor" strokeWidth="4" fill="none" />
              </svg>
            </span>
          </h1>

          <p className="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            Find the best laundry, dry cleaning & steam press partners in your city. Doorstep pickup in 45 minutes with 100% loss-free guarantee.
          </p>

          {/* ─── Dual Search Bar: Location (Kasganj & Operational Areas) + Service Search ─── */}
          <div className="max-w-3xl mx-auto relative">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-emerald-950/5 border-2 border-emerald-600/30 p-2 sm:p-2.5 flex flex-col md:flex-row items-stretch gap-2 transition-all duration-200 focus-within:border-emerald-600 focus-within:ring-4 focus-within:ring-emerald-500/10">
              {/* Left Segment: Location Selector */}
              <div className="relative md:w-5/12">
                <button
                  type="button"
                  onClick={() => setIsLocationDropdownOpen((prev) => !prev)}
                  className="w-full h-full px-3.5 py-3 rounded-xl sm:rounded-2xl bg-gray-50/80 hover:bg-gray-100/80 transition-colors flex items-center justify-between gap-2.5 text-left cursor-pointer border border-transparent focus:border-emerald-300"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <IconMapPin className="w-5 h-5 text-emerald-700 shrink-0" />
                    <span className="text-xs sm:text-sm font-bold text-gray-800 truncate">
                      {selectedLocation}
                    </span>
                  </div>
                  <IconChevronDown
                    className={`w-4 h-4 text-gray-500 shrink-0 transition-transform duration-200 ${
                      isLocationDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Location Dropdown Modal */}
                {isLocationDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-full sm:w-80 bg-white rounded-2xl shadow-2xl border border-gray-200/90 py-2.5 z-50 animate-slide-up text-left">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                        Operational City: Kasganj, UP
                      </span>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Active hyper-local pickup with sub-12 min captain dispatch.
                      </p>
                    </div>

                    <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Available Service Zones
                    </div>
                    {AVAILABLE_LOCALITIES.map((loc) => (
                      <button
                        key={loc.name}
                        type="button"
                        onClick={() => handleSelectLocality(loc.name)}
                        className={`w-full px-4 py-2 text-xs flex items-center justify-between text-left cursor-pointer transition-colors ${
                          selectedLocation === loc.name
                            ? "bg-emerald-50/80 text-emerald-950 font-bold"
                            : "text-gray-700 hover:bg-gray-50 hover:text-emerald-900"
                        }`}
                      >
                        <span className="truncate">{loc.name}</span>
                        <span className="text-[10px] text-emerald-700 font-bold shrink-0">{loc.eta}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Center Divider */}
              <div className="hidden md:block w-px bg-gray-200 my-1 self-stretch" />

              {/* Right Segment: Service Search Input */}
              <div className="relative flex-1 flex items-center min-w-0">
                <div className="relative flex-1 flex items-center">
                  <IconSearch className="w-4 h-4 text-gray-400 ml-3 absolute pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
                    placeholder="Search for Wash & Fold, Dry Cleaning, Steam Press..."
                    className="w-full pl-9 pr-3 py-3 rounded-xl text-xs sm:text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none bg-transparent"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="p-1 mr-2 text-gray-400 hover:text-gray-700 cursor-pointer"
                    >
                      <IconClose className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleServiceClick()}
                  className="px-5 sm:px-6 py-3 rounded-xl sm:rounded-2xl font-bold text-white text-xs sm:text-sm shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shrink-0 ml-1 flex items-center gap-1.5"
                  style={{ background: GREEN }}
                >
                  <span>Explore Services</span>
                  <IconArrowRight className="w-3.5 h-3.5" />
                </button>

                {/* Instant Search Suggestions Dropdown */}
                {isSearchFocused && searchQuery.trim() && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 py-2 z-50 animate-slide-up text-left max-h-72 overflow-y-auto">
                    <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Available Services ({filteredServices.length})
                    </div>
                    {filteredServices.length > 0 ? (
                      filteredServices.map((svc) => (
                        <div
                          key={svc.id}
                          className="px-4 py-2.5 hover:bg-emerald-50/60 flex items-center justify-between cursor-pointer border-b border-gray-50 last:border-b-0"
                          onClick={() => {
                            handleServiceClick(svc.id);
                            setSearchQuery("");
                          }}
                        >
                          <div>
                            <div className="text-xs sm:text-sm font-bold text-gray-900">{svc.title}</div>
                            <div className="text-[11px] text-gray-500">{svc.category} • {svc.price}</div>
                          </div>
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                            Go to Service →
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-xs text-gray-500">
                        No service found for "{searchQuery}". Available: Wash & Fold, Dry Cleaning, Steam Press, Shoe Spa.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Keyword Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs">
              <span className="text-gray-500 font-medium">Available:</span>
              {[
                { label: "Wash & Fold", id: "wash-fold" },
                { label: "Italian Dry Cleaning", id: "dry-cleaning" },
                { label: "Steam Pressing", id: "steam-iron" },
                { label: "Shoe & Sneaker Spa", id: "shoe-cleaning" },
                { label: "Blanket & Quilt Care", id: "blanket-cleaning" },
              ].map((pill) => (
                <button
                  key={pill.label}
                  type="button"
                  onClick={() => handleServiceClick(pill.id)}
                  className="px-3 py-1 rounded-full bg-white border border-gray-200/90 text-gray-700 hover:text-emerald-900 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all font-semibold text-[11px] cursor-pointer shadow-2xs"
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. The 4 App Ecosystem Cards (Zomato Multi-App Style - Screenshot 2) ───── */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {/* Card 1: quickpress (Customer App) - Peach/Pink tint */}
            <div
              onClick={() => onOpenModal("booking")}
              className="rounded-[32px] p-7 flex flex-col items-center text-center justify-between border border-rose-100/80 bg-gradient-to-b from-[#FFF5F5] via-[#FFF9F9] to-white shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group"
            >
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[28px] bg-[#E23744] shadow-md shadow-rose-900/10 flex items-center justify-center p-3 mb-5 group-hover:scale-105 transition-transform duration-300 overflow-hidden">
                <img
                  src={customerLogo}
                  alt="quickpress"
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>

              <div className="space-y-2 mb-6">
                <h3 className="text-2xl font-black text-gray-950 tracking-tight lowercase">
                  quickpress
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-[210px] mx-auto">
                  Get the app now to start scheduling doorstep laundry, dry cleaning & shoe spa!
                </p>
              </div>

              <div className="text-xs sm:text-sm font-black text-[#E23744] flex items-center gap-1 group-hover:gap-2 transition-all">
                <span>Check it out</span>
                <span className="text-[10px]">▶</span>
              </div>
            </div>

            {/* Card 2: partner hub (Partner Merchant App) - Soft Yellow/Gold tint */}
            <div
              onClick={() => onNavigate("partners")}
              className="rounded-[32px] p-7 flex flex-col items-center text-center justify-between border border-amber-100/80 bg-gradient-to-b from-[#FEFCE8] via-[#FFFDF5] to-white shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group"
            >
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[28px] bg-[#F7C942] shadow-md shadow-amber-900/10 flex items-center justify-center p-3 mb-5 group-hover:scale-105 transition-transform duration-300 overflow-hidden">
                <img
                  src={partnerLogo}
                  alt="partner hub"
                  className="w-full h-full object-contain bg-white rounded-xl p-1"
                />
              </div>

              <div className="space-y-2 mb-6">
                <h3 className="text-2xl font-black text-gray-950 tracking-tight lowercase">
                  partner hub
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-[210px] mx-auto">
                  Cloud POS, live order intake & automated payouts for laundromats and processing plants.
                </p>
              </div>

              <div className="text-xs sm:text-sm font-black text-amber-800 flex items-center gap-1 group-hover:gap-2 transition-all">
                <span>Check it out</span>
                <span className="text-[10px]">▶</span>
              </div>
            </div>

            {/* Card 3: captain fleet (Delivery Rider App) - Purple tint */}
            <div
              onClick={() => onNavigate("ecosystem")}
              className="rounded-[32px] p-7 flex flex-col items-center text-center justify-between border border-purple-100/80 bg-gradient-to-b from-[#F5F3FF] via-[#FAF8FF] to-white shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group"
            >
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[28px] bg-gradient-to-br from-[#5E35B1] to-[#3949AB] shadow-md shadow-purple-900/10 flex items-center justify-center p-3 mb-5 group-hover:scale-105 transition-transform duration-300 overflow-hidden">
                <img
                  src={captainLogo}
                  alt="captain fleet"
                  className="w-full h-full object-contain bg-white rounded-xl p-1"
                />
              </div>

              <div className="space-y-2 mb-6">
                <h3 className="text-2xl font-black text-gray-950 tracking-tight lowercase">
                  captain fleet
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-[210px] mx-auto">
                  Hyper-local pickup dispatch, barcode bag scans, and instant delivery earnings.
                </p>
              </div>

              <div className="text-xs sm:text-sm font-black text-indigo-700 flex items-center gap-1 group-hover:gap-2 transition-all">
                <span>Check it out</span>
                <span className="text-[10px]">▶</span>
              </div>
            </div>

            {/* Card 4: enterprise care (B2B Supply & Institutional) - Emerald/Mint tint */}
            <div
              onClick={() => onNavigate("services")}
              className="rounded-[32px] p-7 flex flex-col items-center text-center justify-between border border-emerald-100/80 bg-gradient-to-b from-[#F0FDF4] via-[#F7FEFA] to-white shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group"
            >
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[28px] bg-gradient-to-br from-[#1A7A3C] to-[#0F4622] shadow-md shadow-emerald-900/10 flex items-center justify-center p-3 mb-5 group-hover:scale-105 transition-transform duration-300 text-white">
                <div className="text-center">
                  <IconBuilding className="w-9 h-9 mx-auto text-emerald-200" />
                  <span className="text-[9px] font-black tracking-widest uppercase block mt-1">B2B CARE</span>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <h3 className="text-2xl font-black text-gray-950 tracking-tight lowercase">
                  enterprise care
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-[210px] mx-auto">
                  Offering complete bulk garment care & laundry supply chain solutions for your business.
                </p>
              </div>

              <div className="text-xs sm:text-sm font-black text-emerald-800 flex items-center gap-1 group-hover:gap-2 transition-all">
                <span>Check it out</span>
                <span className="text-[10px]">▶</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. "What's waiting for you on the app?" Showcase (Screenshot 4) ─────────── */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-rose-50/40 via-white to-gray-50/60 border-t border-gray-100 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Section Header */}
          <div className="max-w-3xl mx-auto mb-16 sm:mb-20">
            <h2 className="text-4xl sm:text-6xl font-black text-[#E23744] tracking-tight leading-tight mb-4">
              What’s waiting for you <br />
              on the app?
            </h2>
            <p className="text-sm sm:text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
              Our app is packed with features that enable you to experience laundry & garment care like never before
            </p>
          </div>

          {/* Central Smartphone with Surrounding Floating Feature Badges */}
          <div className="relative max-w-4xl mx-auto flex items-center justify-center min-h-[460px]">
            {/* Desktop Left Column Floating Badges */}
            <div className="hidden lg:flex flex-col gap-5 absolute left-0 top-1/2 -translate-y-1/2 z-20 w-56 text-left">
              {/* Badge 1: RO Water Wash */}
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 shadow-lg border border-gray-100 flex items-center gap-3 hover:scale-105 transition-transform duration-200">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <IconSparkle className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <span className="text-xs font-black text-gray-900 block">RO Water Wash</span>
                  <span className="text-[10px] text-gray-400 font-semibold block">0% Hard Minerals</span>
                </div>
              </div>

              {/* Badge 2: Eco Botanical (with toggle switch!) */}
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 shadow-lg border border-gray-100 flex items-center justify-between gap-3 hover:scale-105 transition-transform duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <IconShield className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-gray-900 block">Eco Mode</span>
                    <span className="text-[10px] text-gray-400 font-semibold block">100% Plant Safe</span>
                  </div>
                </div>
                <div
                  onClick={() => setEcoModeActive(!ecoModeActive)}
                  className={`w-11 h-6 rounded-full flex items-center p-1 cursor-pointer transition-colors ${
                    ecoModeActive ? "bg-emerald-600" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                      ecoModeActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
              </div>

              {/* Badge 3: Shoe Spa */}
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 shadow-lg border border-gray-100 flex items-center gap-3 hover:scale-105 transition-transform duration-200">
                <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <IconFootprints className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <span className="text-xs font-black text-gray-900 block">Sneaker Spa</span>
                  <span className="text-[10px] text-gray-400 font-semibold block">Deep Sole Scrub</span>
                </div>
              </div>

              {/* Badge 4: Zero Lost Clothes */}
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 shadow-lg border border-gray-100 flex items-center gap-3 hover:scale-105 transition-transform duration-200">
                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <span className="text-lg">🛡️</span>
                </div>
                <div>
                  <span className="text-xs font-black text-gray-900 block">Zero Loss QA</span>
                  <span className="text-[10px] text-gray-400 font-semibold block">Barcode QR Tagged</span>
                </div>
              </div>
            </div>

            {/* Central Smartphone Mockup */}
            <div className="relative w-72 sm:w-80 rounded-[44px] p-3.5 bg-gray-950 shadow-2xl border-4 border-gray-800 z-10">
              {/* Speaker Notch */}
              <div className="w-28 h-4 bg-gray-900 rounded-full mx-auto mb-4" />

              {/* Inner Smartphone Screen Content */}
              <div className="bg-gradient-to-b from-gray-50 via-white to-gray-50 rounded-[32px] p-5 space-y-4 border border-gray-100 min-h-[360px] flex flex-col justify-between text-center">
                {/* Screen Header */}
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 text-[10px] font-black">
                  <span className="text-emerald-800">QUICKPRESS GO</span>
                  <span className="text-gray-400">Kasganj Flagship</span>
                </div>

                {/* Calendar Schedule Card (Matches Screenshot 4!) */}
                <div className="p-5 rounded-2xl bg-white shadow-md border border-gray-100 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-rose-50 text-[#E23744] flex items-center justify-center mx-auto shadow-2xs">
                    <span className="text-2xl">📅</span>
                  </div>

                  <div>
                    <h4 className="text-base font-black text-gray-950">Schedule your order</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Choose 1-hour collection slot that fits your schedule
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-live-dot" />
                    <span>Today, 10:30 AM Slot Available</span>
                  </div>
                </div>

                {/* Bottom App Button */}
                <button
                  type="button"
                  onClick={() => onOpenModal("booking")}
                  className="w-full py-3 rounded-xl bg-gray-950 hover:bg-black text-white font-black text-xs shadow-md cursor-pointer transition-transform hover:scale-[1.02]"
                >
                  Book 45-Min Pickup →
                </button>
              </div>

              {/* Bottom Home Indicator */}
              <div className="w-28 h-1 bg-gray-700 rounded-full mx-auto mt-3" />
            </div>

            {/* Desktop Right Column Floating Badges */}
            <div className="hidden lg:flex flex-col gap-5 absolute right-0 top-1/2 -translate-y-1/2 z-20 w-56 text-left">
              {/* Badge 5: Italian Steam Press */}
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 shadow-lg border border-gray-100 flex items-center gap-3 hover:scale-105 transition-transform duration-200">
                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <IconIron className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <span className="text-xs font-black text-gray-900 block">Steam Press</span>
                  <span className="text-[10px] text-gray-400 font-semibold block">Italian Vacuum Former</span>
                </div>
              </div>

              {/* Badge 6: Offers & VIP Club */}
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 shadow-lg border border-gray-100 flex items-center gap-3 hover:scale-105 transition-transform duration-200">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <span className="text-lg">🏷️</span>
                </div>
                <div>
                  <span className="text-xs font-black text-gray-900 block">Offers & Rewards</span>
                  <span className="text-[10px] text-blue-600 font-bold block">Up to 25% Savings</span>
                </div>
              </div>

              {/* Badge 7: Live GPS Route */}
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 shadow-lg border border-gray-100 flex items-center gap-3 hover:scale-105 transition-transform duration-200">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <IconVan className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <span className="text-xs font-black text-gray-900 block">Live GPS Telemetry</span>
                  <span className="text-[10px] text-gray-400 font-semibold block">Sub-12 Min Tracking</span>
                </div>
              </div>

              {/* Badge 8: Express 4-Hour */}
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 shadow-lg border border-gray-100 flex items-center gap-3 hover:scale-105 transition-transform duration-200">
                <div className="w-11 h-11 rounded-xl bg-rose-50 text-[#E23744] flex items-center justify-center shrink-0">
                  <IconBolt className="w-6 h-6 text-[#E23744]" />
                </div>
                <div>
                  <span className="text-xs font-black text-gray-900 block">Express 4-Hour</span>
                  <span className="text-[10px] text-gray-400 font-semibold block">Same-Day Wardrobe</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Feature Badges Grid (Shown on tablet & mobile) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-10 lg:hidden text-left">
            {[
              { title: "RO Water Wash", sub: "0% Hard Minerals", icon: "💧" },
              { title: "Eco Mode", sub: "100% Plant Safe", icon: "🌱" },
              { title: "Italian Steam", sub: "Vacuum-Bed Former", icon: "👔" },
              { title: "Sneaker Spa", sub: "Deep Sole Scrub", icon: "👟" },
              { title: "Zero Loss QA", sub: "Barcode QR Tagged", icon: "🛡️" },
              { title: "Offers & VIP", sub: "Up to 25% Savings", icon: "🏷️" },
              { title: "Live GPS", sub: "Sub-12 Min Tracking", icon: "🛵" },
              { title: "Express 4h", sub: "Same-Day Return", icon: "⚡" },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-3 shadow-xs border border-gray-100 flex items-center gap-2.5">
                <span className="text-lg">{f.icon}</span>
                <div className="min-w-0">
                  <span className="text-xs font-black text-gray-900 block truncate">{f.title}</span>
                  <span className="text-[10px] text-gray-400 block truncate">{f.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4. Email Link Dispatch Tool (Support For All 3 Apps) ────────────────────── */}
      <section className="py-12 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
            Instant Email Dispatch
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-gray-950 mt-2 mb-2">
            Receive Download Links Directly in Your Inbox
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 max-w-lg mx-auto mb-6">
            Pick your apps and enter your email address to get verified APK download links sent immediately.
          </p>

          <form onSubmit={handleSendAppLinksEmail} className="max-w-xl mx-auto flex flex-col sm:flex-row gap-2.5">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Enter your email address"
              required
              className="flex-1 px-4 py-3 rounded-2xl border border-gray-300 text-xs sm:text-sm text-gray-900 focus:outline-none focus:border-emerald-600 bg-white shadow-2xs"
            />
            <button
              type="submit"
              disabled={isSubmittingEmail}
              className="px-6 py-3 rounded-2xl font-bold text-white text-xs sm:text-sm shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shrink-0 disabled:opacity-50"
              style={{ background: GREEN }}
            >
              {isSubmittingEmail ? "Sending..." : "Send Links to Email"}
            </button>
          </form>

          {emailSuccessMessage && (
            <p className="text-xs font-bold text-emerald-800 mt-3 animate-fade-in">
              ✓ {emailSuccessMessage}
            </p>
          )}
        </div>
      </section>

      {/* ─── 5. "Download the app now!" QR Card (Screenshot 5 - Placed at Page End) ─── */}
      <section className="py-16 sm:py-24 bg-white border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-[36px] bg-gradient-to-r from-rose-50/50 via-[#FFF9F9] to-white border border-rose-100/70 p-8 sm:p-12 lg:p-14 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 sm:gap-12">
            {/* Background Aesthetic Waves */}
            <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full border border-rose-200/40 pointer-events-none" />
            <div className="absolute -right-10 -top-10 w-96 h-96 rounded-full border border-rose-200/20 pointer-events-none" />
            <div className="absolute -right-32 -bottom-20 w-[420px] h-[420px] rounded-full border border-rose-200/30 pointer-events-none" />

            {/* Left Content Column */}
            <div className="md:w-7/12 space-y-4 text-center md:text-left relative z-10">
              <h2 className="text-3xl sm:text-5xl font-black text-gray-950 tracking-tight leading-[1.12]">
                Download the app now!
              </h2>

              <p className="text-sm sm:text-lg text-gray-600 leading-relaxed max-w-md">
                Experience seamless online laundry & garment care only on the QuickPress app
              </p>

              {/* Store Download Badges (Google Play + App Store) */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => onOpenModal("download_app")}
                  className="px-5 py-2.5 rounded-2xl bg-black hover:bg-gray-900 text-white flex items-center gap-2.5 shadow-md hover:scale-105 transition-all cursor-pointer"
                >
                  <IconGooglePlay className="w-5 h-5 text-emerald-400" />
                  <div className="text-left">
                    <span className="text-[8px] uppercase tracking-wider text-gray-400 block leading-none">GET IT ON</span>
                    <span className="text-xs sm:text-sm font-bold block leading-tight">Google Play</span>
                  </div>
                </button>

                <a
                  href="/apks/QuickPress-Customer.apk"
                  download="QuickPress-Customer.apk"
                  onClick={() => onShowToast("Downloading QuickPress Customer APK...")}
                  className="px-5 py-2.5 rounded-2xl bg-black hover:bg-gray-900 text-white flex items-center gap-2.5 shadow-md hover:scale-105 transition-all cursor-pointer"
                >
                  <IconApple className="w-5 h-5 text-white" />
                  <div className="text-left">
                    <span className="text-[8px] uppercase tracking-wider text-gray-400 block leading-none">Download on the</span>
                    <span className="text-xs sm:text-sm font-bold block leading-tight">App Store</span>
                  </div>
                </a>
              </div>
            </div>

            {/* Right Smartphone Screen Mockup with QR Code (Matches Screenshot 5!) */}
            <div className="md:w-5/12 flex justify-center relative z-10">
              <div className="relative w-64 sm:w-72 rounded-t-[36px] pt-4 px-4 bg-gray-900 shadow-2xl border-4 border-b-0 border-gray-800 -mb-14">
                {/* Speaker Notch */}
                <div className="w-20 h-3.5 bg-gray-950 rounded-full mx-auto mb-4" />

                <div className="bg-white rounded-2xl p-4 sm:p-5 text-center shadow-inner border border-gray-100">
                  <span className="text-xs font-bold text-gray-700 block mb-3 leading-tight">
                    Scan the QR code to <br />download the app
                  </span>

                  {/* Pixel-Perfect Authentic QR Code SVG with Corner Finder Blocks */}
                  <div className="p-3 bg-white rounded-2xl border border-gray-200/90 shadow-xs inline-block">
                    <svg
                      className="w-36 h-36 sm:w-40 sm:h-40"
                      viewBox="0 0 140 140"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {/* Top-Left Finder */}
                      <rect x="10" y="10" width="36" height="36" rx="8" stroke="#E23744" strokeWidth="6" fill="white" />
                      <rect x="22" y="22" width="12" height="12" rx="3" fill="#E23744" />

                      {/* Top-Right Finder */}
                      <rect x="94" y="10" width="36" height="36" rx="8" stroke="#E23744" strokeWidth="6" fill="white" />
                      <rect x="106" y="22" width="12" height="12" rx="3" fill="#E23744" />

                      {/* Bottom-Left Finder */}
                      <rect x="10" y="94" width="36" height="36" rx="8" stroke="#E23744" strokeWidth="6" fill="white" />
                      <rect x="22" y="106" width="12" height="12" rx="3" fill="#E23744" />

                      {/* QR Matrix Dots */}
                      <rect x="54" y="12" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="66" y="12" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="78" y="12" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="54" y="24" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="72" y="24" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="60" y="36" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="78" y="36" width="6" height="6" rx="1.5" fill="#111827" />

                      <rect x="12" y="54" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="24" y="54" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="36" y="54" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="48" y="54" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="60" y="54" width="20" height="20" rx="4" fill="#1A7A3C" />
                      <rect x="86" y="54" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="98" y="54" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="110" y="54" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="122" y="54" width="6" height="6" rx="1.5" fill="#111827" />

                      <rect x="12" y="66" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="36" y="66" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="92" y="66" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="116" y="66" width="6" height="6" rx="1.5" fill="#111827" />

                      <rect x="24" y="78" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="42" y="78" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="84" y="78" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="102" y="78" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="120" y="78" width="6" height="6" rx="1.5" fill="#111827" />

                      <rect x="54" y="90" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="72" y="90" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="90" y="90" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="108" y="90" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="126" y="90" width="6" height="6" rx="1.5" fill="#111827" />

                      <rect x="54" y="104" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="66" y="104" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="78" y="104" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="102" y="104" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="120" y="104" width="6" height="6" rx="1.5" fill="#111827" />

                      <rect x="54" y="120" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="72" y="120" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="90" y="120" width="6" height="6" rx="1.5" fill="#111827" />
                      <rect x="114" y="120" width="6" height="6" rx="1.5" fill="#111827" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. FAQs Accordion ───────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-gray-50/70 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
              Got Questions?
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-950 mt-3 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Everything you need to know about QuickPress garment care, partner facilities, and pickup guarantees.
            </p>
          </div>

          <div className="space-y-3.5">
            {FAQS.map((faq, idx) => (
              <div
                key={faq.q}
                className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 font-bold text-gray-900 text-sm sm:text-base cursor-pointer hover:bg-gray-50/70"
                >
                  <span>{faq.q}</span>
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-gray-100 transition-transform duration-200 ${
                      openFaq === idx ? "rotate-180 bg-emerald-100 text-emerald-900" : "text-gray-600"
                    }`}
                  >
                    <IconChevronDown className="w-4 h-4" />
                  </span>
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-gray-600 border-t border-gray-100 leading-relaxed animate-fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
