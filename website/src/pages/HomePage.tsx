import React, { useState, useEffect } from "react";
import { PageType, ModalType, ServiceInfo } from "@/types";
import {
  IconCheck,
  IconSparkle,
  IconBolt,
  IconShield,
  IconCpu,
  IconHandshake,
  IconVan,
  IconLaundry,
  IconBox,
  IconBriefcase,
  IconMapPin,
  IconUsers,
  IconChevronDown,
  IconArrowRight,
  IconSearch,
  IconStar,
  IconClose,
  IconGooglePlay,
  IconSmartphone,
  IconApple,
  IconQrCode,
  IconShirt,
  IconIron,
  IconFootprints,
  IconBag,
} from "@/components/Icons";
import { Logo } from "@/components/Navbar";
import { handleGetStartedRedirect } from "@/utils/storeRedirect";

// QuickPress Brand Colors (Brand Green - NO Red)
const GREEN = "#1A7A3C";
const GREEN_HOVER = "#156331";
const GREEN_DARK = "#0F4622";
const GREEN_LIGHT = "#E8F7EE";
const GREEN_EMERALD = "#059669";
const YELLOW = "#F59E0B";

// Catalog of Core Services for Search & Modal Triggers
const SERVICES_CATALOG: ServiceInfo[] = [
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

// Popular Localities in and around Kasganj & Uttar Pradesh
const POPULAR_LOCALITIES = [
  {
    name: "Civil Lines & Nadrai Gate",
    places: "14 Partner Laundromats",
    eta: "Avg. 15 min pickup",
    popular: true,
  },
  {
    name: "Station Road & Railway Colony",
    places: "9 Partner Laundromats",
    eta: "Avg. 18 min pickup",
    popular: true,
  },
  {
    name: "Bilram Gate & Ganjdundwara Road",
    places: "16 Partner Laundromats",
    eta: "Avg. 12 min pickup",
    popular: true,
  },
  {
    name: "Soron Gate & Mission Compound",
    places: "11 Partner Laundromats",
    eta: "Avg. 20 min pickup",
    popular: true,
  },
  {
    name: "Agra Road & Awas Vikas Colony",
    places: "8 Partner Laundromats",
    eta: "Avg. 22 min pickup",
    popular: false,
  },
  {
    name: "Maroncha Commercial Hub",
    places: "6 Processing Plants",
    eta: "Avg. 25 min pickup",
    popular: false,
  },
  {
    name: "Delhi NCR Express Corridors",
    places: "Direct Transit Connect",
    eta: "Daily Line-haul Fleet",
    popular: false,
  },
  {
    name: "All-India Processing Network",
    places: "Enterprise B2B Hubs",
    eta: "Dedicated SLA Fleet",
    popular: false,
  },
];

// Curated "Collections" Cards (Zomato-style Curated Collections)
const CURATED_COLLECTIONS = [
  {
    id: "coll-express",
    title: "Express 4-Hour Turnaround",
    subtitle: "Urgent wash, dry & press for office, flights & emergencies",
    placesCount: "9 Processing Hubs",
    rating: "4.9",
    ratingCount: "1,840+",
    priceBadge: "From ₹49/kg",
    image: "/images/services/express-laundry.jpg",
    serviceRef: "wash-fold",
    badge: "Fastest SLA",
  },
  {
    id: "coll-dryclean",
    title: "Italian Silk & Dry Cleaning",
    subtitle: "Eco-hydrocarbon care for suits, lehengas & formal attire",
    placesCount: "14 Specialist Hubs",
    rating: "4.98",
    ratingCount: "3,200+",
    priceBadge: "From ₹149/pc",
    image: "/images/services/dry-cleaning.jpg",
    serviceRef: "dry-cleaning",
    badge: "Zero Perchloroethylene",
  },
  {
    id: "coll-steam",
    title: "Italian High-Pressure Steam Iron",
    subtitle: "Vacuum-bed press formers delivered in protective covers",
    placesCount: "18 Stations Active",
    rating: "4.92",
    ratingCount: "2,450+",
    priceBadge: "From ₹9/pc",
    image: "/images/services/steam-iron.jpg",
    serviceRef: "steam-iron",
    badge: "Wrinkle-Free Guarantee",
  },
  {
    id: "coll-shoe",
    title: "Sneaker Spa & Shoe Detailing",
    subtitle: "Multi-stage sole disinfection, suede nap revival & UV cure",
    placesCount: "6 Restorers",
    rating: "4.95",
    ratingCount: "980+",
    priceBadge: "From ₹199/pair",
    image: "/images/services/shoe-cleaning.jpg",
    serviceRef: "shoe-cleaning",
    badge: "Deep Restoration",
  },
];

// Interactive FAQs (Zomato-style clean accordion)
const FAQS = [
  {
    q: "How quickly does a QuickPress Captain arrive for pickup?",
    a: "Within 30 to 45 minutes of booking on the QuickPress app or web platform, our nearest captain arrives at your doorstep with tamper-evident barcode laundry bags.",
  },
  {
    q: "How do you guarantee that clothes will not be mixed up or lost?",
    a: "Every bag is sealed in your presence with a unique serialized barcode QR tag. Each individual garment is tagged and scanned into our cloud POS system before washing, tracking it through all 6 inspection stages.",
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
  // Search & Location States
  const [selectedLocation, setSelectedLocation] = useState("Kasganj, Uttar Pradesh");
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // App Download States
  const [contactMode, setContactMode] = useState<"phone" | "email">("phone");
  const [contactValue, setContactValue] = useState("");
  const [appLinkSent, setAppLinkSent] = useState(false);

  // Locality & Pincode Coverage Checker
  const [pincodeQuery, setPincodeQuery] = useState("");
  const [pincodeStatus, setPincodeStatus] = useState<string | null>(null);

  // FAQ Accordion
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Filtered Services based on search query
  const filteredServices = searchQuery.trim()
    ? SERVICES_CATALOG.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.tagline.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : SERVICES_CATALOG;

  const handleSelectLocality = (locName: string) => {
    setSelectedLocation(locName);
    setIsLocationDropdownOpen(false);
    onShowToast(`📍 Delivery zone set to: ${locName}`);
  };

  const handleDetectLocation = () => {
    if (navigator.geolocation) {
      onShowToast("Detecting your location via GPS...");
      navigator.geolocation.getCurrentPosition(
        () => {
          setSelectedLocation("Current Location (Kasganj & UP Zone)");
          setIsLocationDropdownOpen(false);
          onShowToast("📍 Location detected! Connected to nearest QuickPress Hub.");
        },
        () => {
          setSelectedLocation("Kasganj, Uttar Pradesh");
          setIsLocationDropdownOpen(false);
          onShowToast("📍 Set to default regional hub: Kasganj, UP");
        }
      );
    } else {
      setSelectedLocation("Kasganj, Uttar Pradesh");
      setIsLocationDropdownOpen(false);
    }
  };

  const handleSendAppLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactValue.trim()) return;

    if (contactMode === "phone") {
      const cleanPhone = contactValue.replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        onShowToast("Please enter a valid 10-digit mobile number");
        return;
      }
      setAppLinkSent(true);
      onShowToast(`📲 Download link sent via SMS & WhatsApp to +91 ${cleanPhone}!`);
    } else {
      if (!contactValue.includes("@")) {
        onShowToast("Please enter a valid email address");
        return;
      }
      setAppLinkSent(true);
      onShowToast(`📧 App download link sent to ${contactValue}!`);
    }

    setTimeout(() => {
      setAppLinkSent(false);
      setContactValue("");
    }, 5000);
  };

  const handlePincodeCheck = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pincodeQuery.replace(/\D/g, "");
    if (cleanPin.length !== 6) {
      setPincodeStatus("Please enter a valid 6-digit Indian Postal PIN code.");
      return;
    }
    if (cleanPin.startsWith("207") || cleanPin.startsWith("202") || cleanPin.startsWith("282") || cleanPin.startsWith("110")) {
      setPincodeStatus(`✓ PIN ${cleanPin}: Instant Doorstep Service Available! Avg pickup ETA: 25 mins.`);
      onShowToast(`✓ Service confirmed in ${cleanPin}! Tap Get Started to schedule.`);
    } else {
      setPincodeStatus(`✓ PIN ${cleanPin}: Covered via QuickPress All-India Inter-City Fleet.`);
      onShowToast(`✓ Express logistics active for PIN ${cleanPin}.`);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 selection:bg-emerald-200 selection:text-emerald-950 font-sans">
      {/* ─── 1. Zomato-Style Clean Hero Header ────────────────────────────────────────── */}
      <section className="relative pt-32 sm:pt-40 pb-20 sm:pb-28 bg-gradient-to-b from-emerald-50/70 via-white to-white overflow-hidden border-b border-gray-100">
        {/* Subtle Luxury Mesh Ambient Backdrop */}
        <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[650px] sm:w-[900px] h-[380px] rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${GREEN} 0%, rgba(34,197,94,0) 70%)` }}
        />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Centered Clean Brand Wordmark & Emblem */}
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

          {/* ─── Zomato-Style Dual Search Bar ────────────────────────────────────────── */}
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

                {/* Location Dropdown Modal / Popup */}
                {isLocationDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-full sm:w-80 bg-white rounded-2xl shadow-2xl border border-gray-200/90 py-2.5 z-50 animate-slide-up text-left">
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      className="w-full px-4 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50 flex items-center gap-2.5 cursor-pointer border-b border-gray-100"
                    >
                      <IconSparkle className="w-4 h-4 text-emerald-600" />
                      <span>Detect Current Location (GPS)</span>
                    </button>
                    <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Popular Localities
                    </div>
                    {POPULAR_LOCALITIES.slice(0, 5).map((loc) => (
                      <button
                        key={loc.name}
                        type="button"
                        onClick={() => handleSelectLocality(loc.name)}
                        className="w-full px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-emerald-900 flex items-center justify-between text-left cursor-pointer"
                      >
                        <span className="font-semibold truncate">{loc.name}</span>
                        <span className="text-[10px] text-gray-400 shrink-0">{loc.places.split(" ")[0]} Hubs</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Center Divider for Desktop */}
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
                  onClick={() => onOpenModal("booking")}
                  className="px-5 sm:px-6 py-3 rounded-xl sm:rounded-2xl font-bold text-white text-xs sm:text-sm shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shrink-0 ml-1 flex items-center gap-1.5"
                  style={{ background: GREEN }}
                >
                  <span>Book Now</span>
                  <IconArrowRight className="w-3.5 h-3.5" />
                </button>

                {/* Instant Search Suggestions Dropdown */}
                {isSearchFocused && searchQuery.trim() && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 py-2 z-50 animate-slide-up text-left max-h-72 overflow-y-auto">
                    <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Matching Services ({filteredServices.length})
                    </div>
                    {filteredServices.length > 0 ? (
                      filteredServices.map((svc) => (
                        <div
                          key={svc.id}
                          className="px-4 py-2.5 hover:bg-emerald-50/60 flex items-center justify-between cursor-pointer border-b border-gray-50 last:border-b-0"
                          onClick={() => {
                            onSelectService(svc);
                            setSearchQuery("");
                          }}
                        >
                          <div>
                            <div className="text-xs sm:text-sm font-bold text-gray-900">{svc.title}</div>
                            <div className="text-[11px] text-gray-500">{svc.category} • {svc.price}</div>
                          </div>
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                            View & Book →
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-xs text-gray-500">
                        No service found for "{searchQuery}". Try "Wash", "Dry Clean", or "Iron".
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Keyword Pills (Zomato-style popular search pills) */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs">
              <span className="text-gray-500 font-medium">Popular:</span>
              {[
                { label: "Wash & Fold", id: "wash-fold" },
                { label: "Italian Dry Cleaning", id: "dry-cleaning" },
                { label: "Steam Pressing", id: "steam-iron" },
                { label: "Shoe & Sneaker Spa", id: "shoe-cleaning" },
                { label: "Blanket & Quilt Care", id: "blanket-cleaning" },
              ].map((pill) => {
                const svc = SERVICES_CATALOG.find((s) => s.id === pill.id);
                return (
                  <button
                    key={pill.label}
                    type="button"
                    onClick={() => {
                      if (svc) onSelectService(svc);
                      else onNavigate("services");
                    }}
                    className="px-3 py-1 rounded-full bg-white border border-gray-200/90 text-gray-700 hover:text-emerald-900 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all font-semibold text-[11px] cursor-pointer shadow-2xs"
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. The 3 Big Action / Category Cards (Zomato 3-Card Signature Style) ─────────────── */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {/* Card 1: Doorstep Garment Care (Order Online) */}
            <div
              onClick={() => onOpenModal("booking")}
              className="group rounded-3xl border border-gray-200/90 bg-white shadow-xs hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col justify-between"
            >
              <div className="h-48 sm:h-52 w-full overflow-hidden relative">
                <img
                  src="/images/services/wash-fold.jpg"
                  alt="Doorstep Garment Care"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-emerald-900 border border-emerald-100 shadow-xs">
                  Starts @ ₹29 • 24h Return
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-xl font-black text-gray-950 group-hover:text-emerald-800 transition-colors">
                    Order Doorstep Care
                  </h3>
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-800 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <IconArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Stay home and get everyday laundry, formal dry cleaning, and steam pressing picked up in 45 mins.
                </p>
              </div>
            </div>

            {/* Card 2: Partner Laundromat Network */}
            <div
              onClick={() => onNavigate("partners")}
              className="group rounded-3xl border border-gray-200/90 bg-white shadow-xs hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col justify-between"
            >
              <div className="h-48 sm:h-52 w-full overflow-hidden relative">
                <img
                  src="/images/services/dry-cleaning.jpg"
                  alt="Partner Laundromat Network"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-amber-900 border border-amber-200 shadow-xs">
                  Certified RO Plants
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-xl font-black text-gray-950 group-hover:text-emerald-800 transition-colors">
                    Partner Laundromats
                  </h3>
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-800 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <IconArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Explore our verified network of commercial facilities equipped with Italian steam formers and eco-solvents.
                </p>
              </div>
            </div>

            {/* Card 3: Express Captain Fleet & Intra-City Dispatch */}
            <div
              onClick={() => onNavigate("ecosystem")}
              className="group rounded-3xl border border-gray-200/90 bg-white shadow-xs hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col justify-between"
            >
              <div className="h-48 sm:h-52 w-full overflow-hidden relative">
                <img
                  src="/images/services/express-laundry.jpg"
                  alt="Delivery Captain Fleet"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-emerald-900 border border-emerald-100 shadow-xs">
                  Sub-12 Min Dispatch
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-xl font-black text-gray-950 group-hover:text-emerald-800 transition-colors">
                    Captain & Courier Fleet
                  </h3>
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-800 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <IconArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Real-time GPS route clustering, digital tamper-evident QR bags, and zero loss-loss verification.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. Curated "Collections" Section (Zomato-Style Curated Carousel/Grid) ────────────── */}
      <section className="py-16 sm:py-24 bg-gray-50/70 border-y border-gray-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-black tracking-widest text-emerald-800 uppercase bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-200">
                Curated Collections
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-950 mt-3 tracking-tight">
                Specialized Garment Care In {selectedLocation.split(",")[0]}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-xl">
                Explore verified fabric care packages based on garment sensitivity, urgent timelines, and specialized materials.
              </p>
            </div>

            <button
              onClick={() => onNavigate("services")}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
            >
              <span>All collections in {selectedLocation.split(",")[0]} (10)</span>
              <IconArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {CURATED_COLLECTIONS.map((item) => {
              const svc = SERVICES_CATALOG.find((s) => s.id === item.serviceRef);
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (svc) onSelectService(svc);
                    else onOpenModal("booking");
                  }}
                  className="group relative rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer h-96 flex flex-col justify-end p-5 text-white bg-gray-900 border border-gray-200/60"
                >
                  {/* Background Image with Dark Emerald Gradient Overlay */}
                  <img
                    src={item.image}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent group-hover:from-emerald-950/95 transition-colors duration-300" />

                  {/* Top Badges */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/90 backdrop-blur-xs text-gray-900 shadow-xs">
                      {item.badge}
                    </span>
                    <div className="flex items-center gap-1 bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[11px] font-black shadow-xs">
                      <IconStar className="w-3 h-3 text-yellow-300 fill-current" />
                      <span>{item.rating}</span>
                    </div>
                  </div>

                  {/* Bottom Content */}
                  <div className="relative z-10 space-y-2">
                    <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                      <span>{item.placesCount}</span>
                      <span>•</span>
                      <span>{item.priceBadge}</span>
                    </div>

                    <h3 className="text-lg font-black leading-tight text-white group-hover:text-emerald-200 transition-colors">
                      {item.title}
                    </h3>

                    <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed font-normal">
                      {item.subtitle}
                    </p>

                    <div className="pt-2 flex items-center gap-1 text-xs font-bold text-white group-hover:translate-x-1 transition-transform">
                      <span>Book Service</span>
                      <IconArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 4. Popular Localities Section (Zomato-Style Localities Grid) ─────────────── */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-left">
            <span className="text-xs font-black tracking-widest text-emerald-800 uppercase bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              Coverage & Network
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-950 mt-3 tracking-tight">
              Popular Localities In & Around {selectedLocation.split(",")[0]}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Click any locality to inspect active laundromat partner hubs, scheduled captain routes, and doorstep ETA.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {POPULAR_LOCALITIES.map((loc) => {
              const isSelected = selectedLocation.includes(loc.name.split(" ")[0]);
              return (
                <div
                  key={loc.name}
                  onClick={() => handleSelectLocality(loc.name)}
                  className={`p-5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer group ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/20"
                      : "border-gray-200/80 bg-white hover:border-emerald-400 hover:shadow-md hover:-translate-y-0.5"
                  }`}
                >
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-gray-900 group-hover:text-emerald-900 truncate">
                      {loc.name}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                      <span>{loc.places}</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-semibold">{loc.eta}</span>
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-emerald-100 flex items-center justify-center text-gray-400 group-hover:text-emerald-800 shrink-0 transition-colors">
                    <IconArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })}

            {/* Check Pin Code Card */}
            <div className="p-5 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/30 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                  Instant Coverage Verifier
                </span>
                <h4 className="text-sm font-black text-gray-950 mt-1">
                  Check Your Postal Pincode
                </h4>
                <p className="text-xs text-gray-600 mt-1">
                  Enter any 6-digit Indian PIN code to verify live captain dispatch.
                </p>
              </div>

              <form onSubmit={handlePincodeCheck} className="mt-3 flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 207123"
                  value={pincodeQuery}
                  onChange={(e) => setPincodeQuery(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl border border-gray-300 bg-white text-xs font-bold text-gray-900 focus:outline-none focus:border-emerald-600"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 cursor-pointer shrink-0"
                >
                  Check
                </button>
              </form>

              {pincodeStatus && (
                <p className="text-[11px] font-bold text-emerald-800 mt-2 leading-tight">
                  {pincodeStatus}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. "Get the QuickPress App" Section (Zomato-Style App Showcase) ─────────── */}
      <section className="py-16 sm:py-24 bg-gray-50/70 border-t border-gray-200/70">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl p-6 sm:p-12 border border-gray-200 shadow-xl grid lg:grid-cols-12 gap-8 lg:gap-12 items-center relative overflow-hidden">
            {/* Left Mockup Graphic Column */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-64 sm:w-72 rounded-3xl p-3 bg-gray-900 shadow-2xl border-4 border-gray-800">
                {/* Smartphone Speaker notch */}
                <div className="w-20 h-3.5 bg-gray-950 rounded-full mx-auto mb-3" />

                {/* Smartphone Screen Simulator */}
                <div className="bg-white rounded-2xl p-4 space-y-3.5 border border-gray-100">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-live-dot" />
                      <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                        QuickPress Express
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">Order #84920</span>
                  </div>

                  {/* Live Tracking Card */}
                  <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-100">
                    <div className="flex items-center justify-between text-[10px] font-bold text-emerald-900 mb-1">
                      <span>Captain Alex M.</span>
                      <span className="text-emerald-700">0.4 km away</span>
                    </div>
                    <div className="text-xs font-black text-gray-900">Arriving in 8 Minutes</div>
                    <div className="w-full h-1.5 bg-emerald-200/70 rounded-full mt-2 overflow-hidden">
                      <div className="w-3/4 h-full bg-emerald-600 rounded-full" />
                    </div>
                  </div>

                  {/* Garment Summary Item */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between font-bold text-gray-800 text-[11px]">
                      <span>Wash & Fold (4.2 kg)</span>
                      <span>₹205.80</span>
                    </div>
                    <div className="flex justify-between text-gray-500 text-[10px]">
                      <span>Italian Steam Iron (3 pcs)</span>
                      <span>₹27.00</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-black">
                    <span className="text-gray-500">Security OTP:</span>
                    <span className="text-emerald-800 tracking-widest bg-emerald-100 px-2 py-0.5 rounded-md font-mono">
                      8492
                    </span>
                  </div>
                </div>

                {/* Home Indicator */}
                <div className="w-24 h-1 bg-gray-700 rounded-full mx-auto mt-3" />
              </div>
            </div>

            {/* Right App Download Form Column */}
            <div className="lg:col-span-7 space-y-5">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
                Mobile Experience
              </span>

              <h2 className="text-3xl sm:text-4xl font-black text-gray-950 leading-tight">
                Get the QuickPress App
              </h2>

              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                We will send you a download link. Open it on your phone to install the QuickPress Customer App, track orders in real time, and schedule doorstep pickups with 1 tap.
              </p>

              {/* Radio Selector: Phone vs Email */}
              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
                  <input
                    type="radio"
                    name="contactMode"
                    value="phone"
                    checked={contactMode === "phone"}
                    onChange={() => setContactMode("phone")}
                    className="accent-emerald-700 cursor-pointer"
                  />
                  <span>Phone (SMS & WhatsApp)</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
                  <input
                    type="radio"
                    name="contactMode"
                    value="email"
                    checked={contactMode === "email"}
                    onChange={() => setContactMode("email")}
                    className="accent-emerald-700 cursor-pointer"
                  />
                  <span>Email</span>
                </label>
              </div>

              {/* Input Form with Share App Link Button */}
              <form onSubmit={handleSendAppLink} className="flex flex-col sm:flex-row gap-2.5">
                <div className="flex-1 flex rounded-xl border border-gray-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/10 overflow-hidden bg-white">
                  {contactMode === "phone" && (
                    <span className="px-3.5 py-3 text-xs font-bold text-gray-600 bg-gray-50 border-r border-gray-200 flex items-center">
                      +91
                    </span>
                  )}
                  <input
                    type={contactMode === "phone" ? "tel" : "email"}
                    value={contactValue}
                    onChange={(e) => setContactValue(e.target.value)}
                    placeholder={
                      contactMode === "phone"
                        ? "Enter 10-digit mobile number"
                        : "Enter your email address"
                    }
                    required
                    className="flex-1 px-3.5 py-3 text-xs sm:text-sm text-gray-900 focus:outline-none placeholder:text-gray-400"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl font-bold text-white text-xs sm:text-sm shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shrink-0"
                  style={{ background: GREEN }}
                >
                  {appLinkSent ? "Link Sent ✓" : "Share App Link"}
                </button>
              </form>

              {/* Download Badges */}
              <div className="pt-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2.5">
                  Available On All Platforms
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenModal("download_app");
                    }}
                    className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs hover:scale-105 transition-all"
                  >
                    <IconGooglePlay className="w-4 h-4 text-emerald-400" />
                    <div className="text-left">
                      <div className="text-[8px] uppercase tracking-wider text-gray-400 leading-none">Download on</div>
                      <div className="text-xs font-black leading-tight">Google Play</div>
                    </div>
                  </button>

                  <a
                    href="/apks/QuickPress-Customer.apk"
                    download="QuickPress-Customer.apk"
                    onClick={() => onShowToast("Downloading QuickPress Customer APK...")}
                    className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs hover:scale-105 transition-all"
                  >
                    <IconSmartphone className="w-4 h-4 text-emerald-200" />
                    <div className="text-left">
                      <div className="text-[8px] uppercase tracking-wider text-emerald-200 leading-none">Direct Android</div>
                      <div className="text-xs font-black leading-tight">Download APK</div>
                    </div>
                  </a>

                  <button
                    type="button"
                    onClick={() => onOpenModal("booking")}
                    className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-900 text-xs font-bold border border-gray-200 flex items-center gap-2 cursor-pointer hover:scale-105 transition-all"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-live-dot" />
                    <span>Launch Web App</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. FAQs / "Explore Options Near You" Accordion (Zomato-Style) ──────────── */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
              Got Questions?
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-950 mt-3 tracking-tight">
              Explore Options Near You
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

      {/* ─── 7. Final Clean Call to Action Banner ───────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-emerald-50/50 via-white to-white border-t border-gray-100 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="mb-6 flex justify-center">
            <Logo size="lg" onClick={() => onNavigate("home")} />
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-gray-950 leading-tight mb-4">
            Ready to experience <br />
            <span style={{ color: GREEN }}>QuickPress?</span>
          </h2>

          <p className="text-sm sm:text-lg text-gray-600 mb-8 max-w-xl mx-auto leading-relaxed">
            Schedule a 45-minute doorstep pickup today or join our verified merchant and delivery network.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-10">
            <button
              type="button"
              onClick={() => onOpenModal("booking")}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full font-bold text-white text-sm shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              style={{ background: GREEN }}
            >
              <span>Book a Pickup Now</span>
              <IconArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate("partners")}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full font-bold text-emerald-900 text-sm border-2 border-emerald-700 bg-white hover:bg-emerald-50 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Partner With Us</span>
              <IconArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
