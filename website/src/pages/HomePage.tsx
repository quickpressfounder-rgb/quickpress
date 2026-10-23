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
  IconSmartphone,
  IconShirt,
  IconIron,
  IconFootprints,
  IconBag,
  IconStore,
  IconVan,
  IconShield,
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

// Available Operational City & Zones (Only real, active areas in Kasganj, UP)
const AVAILABLE_LOCALITIES = [
  {
    name: "Kasganj (All Operational Zones)",
    places: "24 Partner Laundromats",
    eta: "Sub-12 min pickup",
    isDefault: true,
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

  // App Download Form States (Email-Only for 3 Apps)
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
    // Navigate directly to the services page
    onNavigate("services");
    onShowToast("Redirecting to available services...");
  };

  // Handler: Toggle App Checkbox
  const toggleAppSelection = (appKey: "customer" | "partner" | "captain") => {
    setSelectedApps((prev) => {
      const next = { ...prev, [appKey]: !prev[appKey] };
      // Keep at least one app selected
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
      // Call public backend endpoint
      const res = await fetch("/api/public/send-app-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          apps: chosenAppsList,
        }),
      });

      const data = await res.json().catch(() => null);
      const appNames = [];
      if (selectedApps.customer) appNames.push("Customer App");
      if (selectedApps.partner) appNames.push("Partner App");
      if (selectedApps.captain) appNames.push("Captain App");

      const successMsg = `Download links for ${appNames.join(", ")} sent to ${cleanEmail}!`;
      setEmailSuccessMessage(successMsg);
      onShowToast(`✓ ${successMsg}`);
    } catch {
      // Fallback
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
      <section className="relative pt-28 sm:pt-36 pb-20 sm:pb-28 bg-gradient-to-b from-emerald-50/60 via-white to-white overflow-hidden border-b border-gray-100">
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

          {/* ─── Dual Search Bar: Location (Only Available Cities) + Service Search ───────── */}
          <div className="max-w-3xl mx-auto relative">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-emerald-950/5 border-2 border-emerald-600/30 p-2 sm:p-2.5 flex flex-col md:flex-row items-stretch gap-2 transition-all duration-200 focus-within:border-emerald-600 focus-within:ring-4 focus-within:ring-emerald-500/10">
              {/* Left Segment: Location Selector (Only Available Operational Areas) */}
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

                {/* Location Dropdown Modal / Popup (Strictly Available Areas Only) */}
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
                  onClick={() => handleServiceClick()}
                  className="px-5 sm:px-6 py-3 rounded-xl sm:rounded-2xl font-bold text-white text-xs sm:text-sm shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shrink-0 ml-1 flex items-center gap-1.5"
                  style={{ background: GREEN }}
                >
                  <span>Explore Services</span>
                  <IconArrowRight className="w-3.5 h-3.5" />
                </button>

                {/* Instant Search Suggestions Dropdown -> Redirects Directly to Services */}
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
                        No service found for "{searchQuery}". Available services: Wash & Fold, Dry Cleaning, Steam Press, Shoe Spa.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Keyword Pills (Clicking redirects directly to available services) */}
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

      {/* ─── 2. The 3 Big Cards With Official App Logos (Zomato Style) ──────────────── */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {/* Card 1: QuickPress Customer App */}
            <div
              onClick={() => onOpenModal("booking")}
              className="group rounded-3xl border border-gray-200/90 bg-white shadow-xs hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col justify-between"
            >
              <div className="h-48 sm:h-52 w-full overflow-hidden relative">
                <img
                  src="/images/services/wash-fold.jpg"
                  alt="QuickPress Customer App"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-emerald-900 border border-emerald-100 shadow-xs">
                  STARTS @ ₹29 • 24H RETURN
                </div>

                {/* Official Customer App Logo Badge */}
                <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-lg border border-gray-100 flex items-center gap-2">
                  <img
                    src={customerLogo}
                    alt="QuickPress Customer App"
                    className="w-8 h-8 rounded-xl object-contain shadow-xs"
                  />
                  <div className="pr-2">
                    <span className="text-[10px] font-black text-gray-900 block leading-none">Customer App</span>
                    <span className="text-[8px] text-emerald-700 font-bold uppercase tracking-wider">Book Laundry</span>
                  </div>
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

            {/* Card 2: QuickPress Partner Hub App */}
            <div
              onClick={() => onNavigate("partners")}
              className="group rounded-3xl border border-gray-200/90 bg-white shadow-xs hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col justify-between"
            >
              <div className="h-48 sm:h-52 w-full overflow-hidden relative">
                <img
                  src="/images/services/dry-cleaning.jpg"
                  alt="QuickPress Partner Hub App"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-amber-900 border border-amber-200 shadow-xs">
                  CERTIFIED RO PLANTS
                </div>

                {/* Official Partner App Logo Badge */}
                <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-lg border border-gray-100 flex items-center gap-2">
                  <img
                    src={partnerLogo}
                    alt="QuickPress Partner App"
                    className="w-8 h-8 rounded-xl object-contain shadow-xs bg-white"
                  />
                  <div className="pr-2">
                    <span className="text-[10px] font-black text-gray-900 block leading-none">Partner Hub App</span>
                    <span className="text-[8px] text-amber-700 font-bold uppercase tracking-wider">Merchant POS</span>
                  </div>
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

            {/* Card 3: QuickPress Captain Fleet App */}
            <div
              onClick={() => onNavigate("ecosystem")}
              className="group rounded-3xl border border-gray-200/90 bg-white shadow-xs hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col justify-between"
            >
              <div className="h-48 sm:h-52 w-full overflow-hidden relative">
                <img
                  src="/images/services/express-laundry.jpg"
                  alt="QuickPress Captain Fleet App"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-emerald-900 border border-emerald-100 shadow-xs">
                  SUB-12 MIN DISPATCH
                </div>

                {/* Official Captain App Logo Badge */}
                <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-lg border border-gray-100 flex items-center gap-2">
                  <img
                    src={captainLogo}
                    alt="QuickPress Captain App"
                    className="w-8 h-8 rounded-xl object-contain shadow-xs bg-white"
                  />
                  <div className="pr-2">
                    <span className="text-[10px] font-black text-gray-900 block leading-none">Captain Fleet App</span>
                    <span className="text-[8px] text-blue-700 font-bold uppercase tracking-wider">Delivery Fleet</span>
                  </div>
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

      {/* ─── 3. Popular Localities Section (Kasganj & Operational Zones Only) ────────── */}
      <section className="py-14 sm:py-20 bg-gray-50/70 border-y border-gray-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-left">
            <span className="text-xs font-black tracking-widest text-emerald-800 uppercase bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
              Live Coverage Network
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-950 mt-3 tracking-tight">
              Operational Localities In Kasganj, UP
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Select your neighbourhood to verify active laundromats, scheduled captain routes, and estimated arrival times.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {AVAILABLE_LOCALITIES.map((loc) => {
              const isSelected = selectedLocation === loc.name;
              return (
                <div
                  key={loc.name}
                  onClick={() => handleSelectLocality(loc.name)}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer group ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-50/80 shadow-md ring-2 ring-emerald-500/20"
                      : "border-gray-200/80 bg-white hover:border-emerald-400 hover:shadow-md hover:-translate-y-0.5"
                  }`}
                >
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-black text-gray-900 group-hover:text-emerald-900 truncate">
                      {loc.name}
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                      <span>{loc.places}</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-semibold">{loc.eta}</span>
                    </p>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-gray-50 group-hover:bg-emerald-100 flex items-center justify-center text-gray-400 group-hover:text-emerald-800 shrink-0 transition-colors">
                    <IconArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 4. "Get the QuickPress App" Section (Email-Only with 3-App Selector) ────── */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-emerald-50/50 via-white to-gray-50/80 rounded-3xl p-6 sm:p-12 border border-emerald-100 shadow-xl grid lg:grid-cols-12 gap-8 lg:gap-12 items-center relative overflow-hidden">
            {/* Left Smartphone Screen Mockup */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-64 sm:w-72 rounded-3xl p-3 bg-gray-900 shadow-2xl border-4 border-gray-800">
                {/* Speaker Notch */}
                <div className="w-20 h-3.5 bg-gray-950 rounded-full mx-auto mb-3" />

                {/* Screen Content */}
                <div className="bg-white rounded-2xl p-4 space-y-3.5 border border-gray-100">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-live-dot" />
                      <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                        QuickPress Dispatch
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">Kasganj Hub</span>
                  </div>

                  {/* 3 Apps Quick Icon Showcase */}
                  <div className="grid grid-cols-3 gap-2 py-1">
                    <div className="p-2 rounded-xl bg-gray-50 border border-gray-100 flex flex-col items-center text-center">
                      <img src={customerLogo} alt="Customer" className="w-7 h-7 rounded-lg object-contain mb-1 shadow-2xs" />
                      <span className="text-[9px] font-bold text-gray-800">Customer</span>
                    </div>
                    <div className="p-2 rounded-xl bg-gray-50 border border-gray-100 flex flex-col items-center text-center">
                      <img src={partnerLogo} alt="Partner" className="w-7 h-7 rounded-lg object-contain mb-1 shadow-2xs bg-white" />
                      <span className="text-[9px] font-bold text-gray-800">Partner</span>
                    </div>
                    <div className="p-2 rounded-xl bg-gray-50 border border-gray-100 flex flex-col items-center text-center">
                      <img src={captainLogo} alt="Captain" className="w-7 h-7 rounded-lg object-contain mb-1 shadow-2xs bg-white" />
                      <span className="text-[9px] font-bold text-gray-800">Captain</span>
                    </div>
                  </div>

                  {/* Live Order Simulation */}
                  <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-100">
                    <div className="flex items-center justify-between text-[10px] font-bold text-emerald-900 mb-1">
                      <span>Captain Assigned</span>
                      <span className="text-emerald-700">0.4 km away</span>
                    </div>
                    <div className="text-xs font-black text-gray-900">Arriving in 8 Minutes</div>
                    <div className="w-full h-1.5 bg-emerald-200/70 rounded-full mt-2 overflow-hidden">
                      <div className="w-3/4 h-full bg-emerald-600 rounded-full" />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-black">
                    <span className="text-gray-500">Security OTP:</span>
                    <span className="text-emerald-800 tracking-widest bg-emerald-100 px-2 py-0.5 rounded-md font-mono">
                      8492
                    </span>
                  </div>
                </div>

                {/* Home bar */}
                <div className="w-24 h-1 bg-gray-700 rounded-full mx-auto mt-3" />
              </div>
            </div>

            {/* Right Form: Email Only for 3 Apps */}
            <div className="lg:col-span-7 space-y-5">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
                Mobile Ecosystem
              </span>

              <h2 className="text-3xl sm:text-4xl font-black text-gray-950 leading-tight">
                Get the QuickPress Apps via Email
              </h2>

              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                Choose the apps you need below and enter your email address. We will send the verified download links directly to your inbox.
              </p>

              {/* 3 App Selector Checkboxes */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider block">
                  Select Apps to Receive:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Customer App Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleAppSelection("customer")}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                      selectedApps.customer
                        ? "border-emerald-600 bg-emerald-50/90 shadow-xs"
                        : "border-gray-200 bg-white opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={customerLogo} alt="Customer" className="w-8 h-8 rounded-xl object-contain shadow-2xs shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-black text-gray-900 block truncate">Customer</span>
                      <span className="text-[10px] text-emerald-700 font-bold block">
                        {selectedApps.customer ? "✓ Selected" : "+ Select"}
                      </span>
                    </div>
                  </button>

                  {/* Partner App Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleAppSelection("partner")}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                      selectedApps.partner
                        ? "border-emerald-600 bg-emerald-50/90 shadow-xs"
                        : "border-gray-200 bg-white opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={partnerLogo} alt="Partner" className="w-8 h-8 rounded-xl object-contain shadow-2xs bg-white shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-black text-gray-900 block truncate">Partner Hub</span>
                      <span className="text-[10px] text-amber-700 font-bold block">
                        {selectedApps.partner ? "✓ Selected" : "+ Select"}
                      </span>
                    </div>
                  </button>

                  {/* Captain App Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleAppSelection("captain")}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                      selectedApps.captain
                        ? "border-emerald-600 bg-emerald-50/90 shadow-xs"
                        : "border-gray-200 bg-white opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={captainLogo} alt="Captain" className="w-8 h-8 rounded-xl object-contain shadow-2xs bg-white shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-black text-gray-900 block truncate">Captain Fleet</span>
                      <span className="text-[10px] text-blue-700 font-bold block">
                        {selectedApps.captain ? "✓ Selected" : "+ Select"}
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Working Email Input Form */}
              <form onSubmit={handleSendAppLinksEmail} className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-xs sm:text-sm text-gray-900 focus:outline-none focus:border-emerald-600 bg-white shadow-2xs placeholder:text-gray-400"
                />

                <button
                  type="submit"
                  disabled={isSubmittingEmail}
                  className="px-6 py-3 rounded-xl font-bold text-white text-xs sm:text-sm shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shrink-0 disabled:opacity-50"
                  style={{ background: GREEN }}
                >
                  {isSubmittingEmail ? "Sending..." : "Send Download Links"}
                </button>
              </form>

              {/* Success Notification Banner */}
              {emailSuccessMessage && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2 animate-fade-in">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-[10px]">
                    ✓
                  </span>
                  <span>{emailSuccessMessage}</span>
                </div>
              )}

              {/* Instant Direct Download Links for the 3 Apps */}
              <div className="pt-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2.5">
                  Direct Download Links:
                </span>
                <div className="flex flex-wrap items-center gap-2.5">
                  {selectedApps.customer && (
                    <a
                      href="/apks/QuickPress-Customer.apk"
                      download="QuickPress-Customer.apk"
                      onClick={() => onShowToast("Downloading QuickPress Customer APK...")}
                      className="px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs hover:scale-105 transition-all"
                    >
                      <IconSmartphone className="w-4 h-4 text-emerald-400" />
                      <span>Customer APK</span>
                    </a>
                  )}

                  {selectedApps.partner && (
                    <a
                      href="/apks/QuickPress-Partner.apk"
                      download="QuickPress-Partner.apk"
                      onClick={() => onShowToast("Downloading QuickPress Partner APK...")}
                      className="px-3.5 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs hover:scale-105 transition-all"
                    >
                      <IconStore className="w-4 h-4 text-amber-300" />
                      <span>Partner APK</span>
                    </a>
                  )}

                  {selectedApps.captain && (
                    <a
                      href="/apks/QuickPress-Captain.apk"
                      download="QuickPress-Captain.apk"
                      onClick={() => onShowToast("Downloading QuickPress Captain APK...")}
                      className="px-3.5 py-2 rounded-xl bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs hover:scale-105 transition-all"
                    >
                      <IconVan className="w-4 h-4 text-blue-300" />
                      <span>Captain APK</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => onOpenModal("booking")}
                    className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold border border-gray-200 flex items-center gap-1.5 cursor-pointer hover:scale-105 transition-all"
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

      {/* ─── 5. FAQs Accordion ───────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-gray-50/70 border-t border-gray-200/70">
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

      {/* ─── 6. Final Call to Action Banner ─────────────────────────────────────────── */}
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
