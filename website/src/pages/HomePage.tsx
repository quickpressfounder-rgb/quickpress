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
  IconIron,
  IconFootprints,
  IconVan,
  IconShield,
  IconBolt,
  IconCrosshair,
} from "@/components/Icons";
import { IPhone15OrderTracking } from "@/components/IPhone15OrderTracking";
import { AreaUnavailableModal } from "@/components/AreaUnavailableModal";
import { handleGetStartedRedirect } from "@/utils/storeRedirect";
import customerLogo from "@/assets/quickpress-customer-logo.jpg";
import partnerLogo from "@/assets/quickpress-partner-blue.png";
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

// Distance calculation helper (Haversine formula to Kasganj Center: 27.8083° N, 78.6453° E)
function getDistanceFromKasganjKm(lat: number, lon: number): number {
  const KASGANJ_LAT = 27.8083;
  const KASGANJ_LON = 78.6453;
  const R = 6371; // Earth radius in km
  const dLat = (lat - KASGANJ_LAT) * (Math.PI / 180);
  const dLon = (lon - KASGANJ_LON) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(KASGANJ_LAT * (Math.PI / 180)) *
      Math.cos(lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Available Operational City & Zones (Kasganj, UP)
const OPERATIONAL_LOCALITIES = [
  {
    name: "Kasganj (All Operational Zones)",
    places: "24 Partner Laundromats",
    eta: "Sub-12 min pickup",
    available: true,
  },
  {
    name: "Civil Lines, Kasganj",
    places: "7 Partner Laundromats",
    eta: "Avg. 15 min pickup",
    available: true,
  },
  {
    name: "Station Road & Railway Colony, Kasganj",
    places: "5 Partner Laundromats",
    eta: "Avg. 18 min pickup",
    available: true,
  },
  {
    name: "Bilram Gate & Main Market, Kasganj",
    places: "6 Partner Laundromats",
    eta: "Avg. 12 min pickup",
    available: true,
  },
  {
    name: "Soron Gate & Mission Compound, Kasganj",
    places: "4 Partner Laundromats",
    eta: "Avg. 20 min pickup",
    available: true,
  },
  {
    name: "Nadrai Gate Commercial Hub, Kasganj",
    places: "5 Partner Laundromats",
    eta: "Avg. 15 min pickup",
    available: true,
  },
  {
    name: "Agra Road & Awas Vikas Colony, Kasganj",
    places: "4 Partner Laundromats",
    eta: "Avg. 20 min pickup",
    available: true,
  },
  {
    name: "Maroncha Processing Corridor, Kasganj",
    places: "3 Master Plants",
    eta: "Avg. 25 min pickup",
    available: true,
  },
];

// Upcoming / Other Cities (Currently Unavailable - For testing & waitlist)
const UPCOMING_LOCALITIES = [
  {
    name: "Delhi NCR (Gurugram / Noida / Delhi)",
    places: "Upcoming Hub",
    eta: "Unavailable",
    available: false,
  },
  {
    name: "Agra (Taj Nagari & Dayalbagh)",
    places: "Upcoming Hub",
    eta: "Unavailable",
    available: false,
  },
  {
    name: "Aligarh (AMU & Centre Point)",
    places: "Upcoming Hub",
    eta: "Unavailable",
    available: false,
  },
  {
    name: "Bareilly (Civil Lines)",
    places: "Upcoming Hub",
    eta: "Unavailable",
    available: false,
  },
  {
    name: "Lucknow (Gomti Nagar)",
    places: "Upcoming Hub",
    eta: "Unavailable",
    available: false,
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
  // Location & Service Availability States
  const [selectedLocation, setSelectedLocation] = useState("Kasganj, Uttar Pradesh");
  const [isServiceAvailable, setIsServiceAvailable] = useState(true);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [isUnavailableModalOpen, setIsUnavailableModalOpen] = useState(false);
  const [unavailableCityName, setUnavailableCityName] = useState("");

  // Search Input State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // App Download States (Email Only for 3 Apps)
  const [emailInput, setEmailInput] = useState("");
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [emailSuccessMessage, setEmailSuccessMessage] = useState<string | null>(null);

  // Feature Showcase Interactive States (Animated Zoom & Toggle)
  const [ecoModeActive, setEcoModeActive] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState("10:30 AM");
  const [activeFeatureHover, setActiveFeatureHover] = useState<string | null>(null);

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

  // Handler: Real GPS Live Location Detection
  const handleDetectCurrentLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      onShowToast("Geolocation is not supported by your browser.");
      return;
    }

    setIsDetectingLocation(true);
    setIsLocationDropdownOpen(false);
    onShowToast("📍 Accessing device GPS to verify service area...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const distKm = getDistanceFromKasganjKm(latitude, longitude);

          // Reverse geocode via OpenStreetMap Nominatim reverse API
          let placeName = "Kasganj, Uttar Pradesh";
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
              { headers: { "Accept-Language": "en" } }
            );
            if (res.ok) {
              const data = await res.json();
              const addr = data.address || {};
              const city =
                addr.city ||
                addr.town ||
                addr.village ||
                addr.suburb ||
                addr.county ||
                addr.state_district ||
                "";
              const state = addr.state || "";
              if (city) {
                placeName = state ? `${city}, ${state}` : city;
              }
            }
          } catch {
            // Network fallback
          }

          // Service area check: within 35 km radius of Kasganj or matching locality
          const lowerPlace = placeName.toLowerCase();
          const isWithinKasganjZone =
            distKm <= 35 ||
            lowerPlace.includes("kasganj") ||
            lowerPlace.includes("soron") ||
            lowerPlace.includes("bilram") ||
            lowerPlace.includes("ganjdundwara") ||
            lowerPlace.includes("sahawar") ||
            lowerPlace.includes("patiali");

          if (isWithinKasganjZone) {
            setSelectedLocation(placeName.includes("Kasganj") ? placeName : `${placeName} (Kasganj Zone)`);
            setIsServiceAvailable(true);
            setUnavailableCityName("");
            onShowToast(`✅ GPS Location Verified: ${placeName} is an active service area!`);
          } else {
            setSelectedLocation(placeName);
            setIsServiceAvailable(false);
            setUnavailableCityName(placeName);
            onShowToast(`⚠️ Services currently unavailable in ${placeName}. QuickPress operates in Kasganj, UP.`);
          }
        } catch {
          onShowToast("Error detecting location. Please select an area manually.");
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (err) => {
        setIsDetectingLocation(false);
        if (err.code === err.PERMISSION_DENIED) {
          onShowToast("GPS access permission denied. Select your area from the list.");
        } else {
          onShowToast("Unable to detect GPS position. Select your area from the list.");
        }
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Handler: Selecting Location from Dropdown
  const handleSelectLocality = (loc: { name: string; available: boolean }) => {
    setSelectedLocation(loc.name);
    setIsLocationDropdownOpen(false);
    if (loc.available) {
      setIsServiceAvailable(true);
      setUnavailableCityName("");
      onShowToast(`📍 Service area confirmed: ${loc.name}`);
    } else {
      setIsServiceAvailable(false);
      setUnavailableCityName(loc.name);
      onShowToast(`⚠️ Services currently unavailable in ${loc.name}.`);
    }
  };

  // Handler: Switch back to Kasganj Hub
  const handleSwitchToKasganj = () => {
    setSelectedLocation("Kasganj, Uttar Pradesh");
    setIsServiceAvailable(true);
    setUnavailableCityName("");
    setIsUnavailableModalOpen(false);
    onShowToast("📍 Switched to Kasganj Super-Hub! 45-min pickup active.");
  };

  // Handler: Selecting Service -> Redirects to App or opens Unavailable Modal
  const handleServiceClick = (serviceId?: string) => {
    if (!isServiceAvailable) {
      setIsUnavailableModalOpen(true);
      return;
    }
    onShowToast("Redirecting to QuickPress app for doorstep scheduling...");
    handleGetStartedRedirect();
  };

  // Handler: Send App Download Links via Email
  const handleSendAppLinksEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      onShowToast("Please enter a valid email address.");
      return;
    }

    setIsSubmittingEmail(true);

    try {
      await fetch("/api/public/send-app-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          apps: ["customer", "partner", "rider"],
        }),
      });

      const successMsg = `Download links for Customer, Partner & Captain Apps sent to ${cleanEmail}!`;
      setEmailSuccessMessage(successMsg);
      onShowToast(`✓ ${successMsg}`);
    } catch {
      const successMsg = `Download links for Customer, Partner & Captain Apps sent to ${cleanEmail}!`;
      setEmailSuccessMessage(successMsg);
      onShowToast(`✓ ${successMsg}`);
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 selection:bg-emerald-200 selection:text-emerald-950 font-sans">
      {/* ─── 1. Clean Hero Header (Top Brand Banner Removed) ─────────────────────────── */}
      <section className="relative pt-16 sm:pt-24 pb-16 sm:pb-24 bg-gradient-to-b from-emerald-50/50 via-white to-white overflow-hidden border-b border-gray-100">
        {/* Subtle Ambient Mesh Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[650px] sm:w-[900px] h-[380px] rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${GREEN} 0%, rgba(34,197,94,0) 70%)` }}
        />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
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
              {/* Left Segment: Location Selector with Live GPS Detection */}
              <div className="relative md:w-5/12">
                <div className="w-full h-full px-3 py-2 rounded-xl sm:rounded-2xl bg-gray-50/90 hover:bg-gray-100/90 transition-colors flex items-center justify-between gap-2 text-left border border-transparent focus-within:border-emerald-300">
                  <button
                    type="button"
                    onClick={() => setIsLocationDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <IconMapPin
                      className={`w-5 h-5 shrink-0 ${
                        isServiceAvailable ? "text-emerald-700" : "text-amber-600 animate-pulse"
                      }`}
                    />
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-gray-900 truncate block">
                        {selectedLocation}
                      </span>
                      <span
                        className={`text-[10px] font-semibold flex items-center gap-1 ${
                          isServiceAvailable ? "text-emerald-700" : "text-amber-700 font-bold"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isServiceAvailable ? "bg-emerald-500 animate-live-dot" : "bg-amber-500"
                          }`}
                        />
                        {isServiceAvailable ? "45-min pickup active" : "Unavailable area"}
                      </span>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Instant GPS Detection Quick Button */}
                    <button
                      type="button"
                      title="Detect My Live Location (GPS)"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDetectCurrentLocation();
                      }}
                      className="p-1.5 rounded-lg bg-emerald-100/80 hover:bg-emerald-200 text-emerald-800 transition-all cursor-pointer shadow-2xs hover:scale-105"
                    >
                      <IconCrosshair
                        className={`w-4 h-4 ${isDetectingLocation ? "animate-spin text-emerald-700" : ""}`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsLocationDropdownOpen((prev) => !prev)}
                      className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
                    >
                      <IconChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isLocationDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Location Dropdown Modal */}
                {isLocationDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-full sm:w-88 bg-white rounded-2xl shadow-2xl border border-gray-200/90 py-2.5 z-50 animate-slide-up text-left max-h-96 overflow-y-auto">
                    {/* Live GPS Detection Button */}
                    <div className="px-3 pb-2.5 border-b border-gray-100">
                      <button
                        type="button"
                        onClick={handleDetectCurrentLocation}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-200 text-emerald-950 font-bold text-xs flex items-center justify-between transition-all cursor-pointer shadow-2xs group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <IconCrosshair
                              className={`w-4 h-4 ${isDetectingLocation ? "animate-spin" : ""}`}
                            />
                          </div>
                          <div>
                            <span className="block font-black text-emerald-950 text-left">
                              {isDetectingLocation ? "Detecting Live GPS..." : "Detect My Live Location"}
                            </span>
                            <span className="text-[10px] text-emerald-800 font-medium block text-left">
                              Auto GPS check & 45-min pickup validation
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-emerald-700 bg-white px-2 py-0.5 rounded shadow-2xs">
                          GPS
                        </span>
                      </button>
                    </div>

                    <div className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50/50 flex items-center justify-between">
                      <span>Available Operational Zones (Kasganj Hub)</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-live-dot" />
                    </div>
                    {OPERATIONAL_LOCALITIES.map((loc) => (
                      <button
                        key={loc.name}
                        type="button"
                        onClick={() => handleSelectLocality(loc)}
                        className={`w-full px-4 py-2 text-xs flex items-center justify-between text-left cursor-pointer transition-colors ${
                          selectedLocation === loc.name
                            ? "bg-emerald-50 text-emerald-950 font-bold"
                            : "text-gray-700 hover:bg-gray-50 hover:text-emerald-900"
                        }`}
                      >
                        <div className="truncate">
                          <span className="truncate block font-semibold">{loc.name}</span>
                          <span className="text-[10px] text-gray-400 block">{loc.places}</span>
                        </div>
                        <span className="text-[10px] text-emerald-700 font-bold shrink-0">{loc.eta}</span>
                      </button>
                    ))}

                    <div className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50/70 border-t border-gray-100 mt-1">
                      Upcoming Cities (Currently Unavailable)
                    </div>
                    {UPCOMING_LOCALITIES.map((loc) => (
                      <button
                        key={loc.name}
                        type="button"
                        onClick={() => handleSelectLocality(loc)}
                        className={`w-full px-4 py-2 text-xs flex items-center justify-between text-left cursor-pointer transition-colors ${
                          selectedLocation === loc.name
                            ? "bg-amber-50 text-amber-950 font-bold"
                            : "text-gray-600 hover:bg-amber-50/50 hover:text-amber-900"
                        }`}
                      >
                        <span className="truncate">{loc.name}</span>
                        <span className="text-[10px] text-amber-700 font-bold bg-amber-100/70 px-1.5 py-0.5 rounded shrink-0">
                          {loc.eta}
                        </span>
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

            {/* Unavailable Area Notice Banner (shown when detected/selected location is outside Kasganj) */}
            {!isServiceAvailable && (
              <div className="mt-3 bg-amber-50 border-2 border-amber-300 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-left animate-slide-up shadow-sm">
                <div className="flex items-start sm:items-center gap-3">
                  <span className="text-2xl shrink-0">⚠️</span>
                  <div>
                    <div className="text-xs sm:text-sm font-black text-amber-950">
                      Services Currently Unavailable in {selectedLocation}
                    </div>
                    <div className="text-[11px] text-amber-800 leading-snug mt-0.5">
                      QuickPress operates exclusively across Kasganj, UP with sub-12 min captain dispatch. We're launching in your city soon!
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleSwitchToKasganj}
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    Switch to Kasganj Hub
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsUnavailableModalOpen(true)}
                    className="px-3.5 py-2 bg-amber-200/90 hover:bg-amber-300 text-amber-950 font-bold text-xs rounded-xl transition-all cursor-pointer whitespace-nowrap"
                  >
                    Notify Me
                  </button>
                </div>
              </div>
            )}

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

      {/* ─── 2. The 3 Big Cards With Real Logos & Generous UI (Zomato-Style Bada Bada UI) ── */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
            {/* Card 1: quickpress (Customer App) - Real Yellow Customer Logo */}
            <div
              onClick={() => onOpenModal("booking")}
              className="rounded-[40px] p-8 sm:p-12 flex flex-col items-center text-center justify-between min-h-[460px] sm:min-h-[500px] border border-amber-200/70 bg-gradient-to-b from-[#FEFCE8]/80 via-[#FFFDF5] to-white shadow-md hover:shadow-2xl hover:-translate-y-3 transition-all duration-500 cursor-pointer group relative overflow-hidden"
            >
              {/* Big Real Customer Squircle Logo */}
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-[36px] bg-[#FFCA28] shadow-xl shadow-amber-900/15 flex items-center justify-center p-3 mb-8 group-hover:scale-108 transition-transform duration-500 overflow-hidden">
                <img
                  src={customerLogo}
                  alt="QuickPress Customer App"
                  className="w-full h-full object-contain rounded-2xl"
                />
              </div>

              <div className="space-y-3 mb-6">
                <h3 className="text-3xl sm:text-4xl font-black text-gray-950 tracking-tight lowercase">
                  quickpress
                </h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-xs mx-auto">
                  Get the app now to start scheduling doorstep laundry, dry cleaning & shoe spa in 45 mins!
                </p>
              </div>

              <div className="text-sm sm:text-base font-black text-emerald-800 flex items-center gap-1.5 group-hover:gap-3 transition-all mt-4">
                <span>Check it out</span>
                <span className="text-xs">▶</span>
              </div>
            </div>

            {/* Card 2: partner hub (Partner Merchant App) - Real Blue & White Partner Logo */}
            <div
              onClick={() => onOpenModal("partner")}
              className="rounded-[40px] p-8 sm:p-12 flex flex-col items-center text-center justify-between min-h-[460px] sm:min-h-[500px] border border-blue-200/70 bg-gradient-to-b from-[#EFF6FF]/80 via-[#F8FAFC] to-white shadow-md hover:shadow-2xl hover:-translate-y-3 transition-all duration-500 cursor-pointer group relative overflow-hidden"
            >
              {/* Big Real Partner Squircle Logo (Blue background, White text) */}
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-[36px] bg-[#1D4ED8] shadow-xl shadow-blue-900/15 flex items-center justify-center p-3 mb-8 group-hover:scale-108 transition-transform duration-500 overflow-hidden">
                <img
                  src={partnerLogo}
                  alt="QuickPress Partner Hub"
                  className="w-full h-full object-contain rounded-2xl"
                />
              </div>

              <div className="space-y-3 mb-6">
                <h3 className="text-3xl sm:text-4xl font-black text-gray-950 tracking-tight lowercase">
                  partner hub
                </h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-xs mx-auto">
                  Cloud POS, live order intake & automated weekly bank payouts for laundromats and processing facilities.
                </p>
              </div>

              <div className="text-sm sm:text-base font-black text-blue-700 flex items-center gap-1.5 group-hover:gap-3 transition-all mt-4">
                <span>Check it out</span>
                <span className="text-xs">▶</span>
              </div>
            </div>

            {/* Card 3: captain fleet (Delivery Rider App) - Real Captain Logo */}
            <div
              onClick={() => {
                const a = document.createElement("a");
                a.href = "/apks/QuickPress-Captain.apk";
                a.download = "QuickPress-Captain.apk";
                a.click();
              }}
              className="rounded-[40px] p-8 sm:p-12 flex flex-col items-center text-center justify-between min-h-[460px] sm:min-h-[500px] border border-emerald-200/70 bg-gradient-to-b from-[#ECFDF5]/80 via-[#F7FEFA] to-white shadow-md hover:shadow-2xl hover:-translate-y-3 transition-all duration-500 cursor-pointer group relative overflow-hidden"
            >
              {/* Big Real Captain Squircle Logo */}
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-[36px] bg-white shadow-xl shadow-emerald-900/15 flex items-center justify-center p-3 mb-8 group-hover:scale-108 transition-transform duration-500 overflow-hidden border border-emerald-100">
                <img
                  src={captainLogo}
                  alt="QuickPress Captain Fleet"
                  className="w-full h-full object-contain rounded-2xl"
                />
              </div>

              <div className="space-y-3 mb-6">
                <h3 className="text-3xl sm:text-4xl font-black text-gray-950 tracking-tight lowercase">
                  captain fleet
                </h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-xs mx-auto">
                  Hyper-local pickup dispatch, barcode bag scans, and instant daily & weekly delivery earnings for riders.
                </p>
              </div>

              <div className="text-sm sm:text-base font-black text-emerald-800 flex items-center gap-1.5 group-hover:gap-3 transition-all mt-4">
                <span>Check it out</span>
                <span className="text-xs">▶</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. "What's waiting for you on the app?" (Green Theme + Attractive Zoom Animation) ── */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-emerald-50/40 via-white to-gray-50/60 border-t border-gray-100 relative overflow-hidden">
        {/* Glow Rings behind Section */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-emerald-300/10 blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Section Header (In Clean Brand Green - Zero Red) */}
          <div className="max-w-3xl mx-auto mb-16 sm:mb-20">
            <h2 className="text-4xl sm:text-6xl font-black text-emerald-900 tracking-tight leading-tight mb-4">
              What’s waiting for you <br />
              <span style={{ color: GREEN }}>on the app?</span>
            </h2>
            <p className="text-sm sm:text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
              Our app is packed with features that enable you to experience laundry & garment care like never before
            </p>
          </div>

          {/* Central Smartphone with Surrounding Floating Feature Badges */}
          <div className="relative max-w-4xl mx-auto flex items-center justify-center min-h-[500px]">
            {/* Desktop Left Column Floating Badges */}
            <div className="hidden lg:flex flex-col gap-6 absolute left-0 top-1/2 -translate-y-1/2 z-20 w-60 text-left">
              {/* Badge 1: RO Water Wash */}
              <div
                onMouseEnter={() => setActiveFeatureHover("ro-water")}
                onMouseLeave={() => setActiveFeatureHover(null)}
                className={`bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-gray-100 flex items-center gap-3.5 hover:scale-115 hover:shadow-2xl transition-all duration-300 cursor-pointer ${
                  activeFeatureHover === "ro-water" ? "ring-2 ring-blue-500 scale-110 shadow-xl" : ""
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="text-2xl">💧</span>
                </div>
                <div>
                  <span className="text-sm font-black text-gray-900 block">RO Water Wash</span>
                  <span className="text-[11px] text-gray-400 font-semibold block">0% Hard Minerals</span>
                </div>
              </div>

              {/* Badge 2: Eco Botanical Mode (Interactive Toggle) */}
              <div
                onMouseEnter={() => setActiveFeatureHover("eco-mode")}
                onMouseLeave={() => setActiveFeatureHover(null)}
                className={`bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-gray-100 flex items-center justify-between gap-3 hover:scale-115 hover:shadow-2xl transition-all duration-300 cursor-pointer ${
                  activeFeatureHover === "eco-mode" ? "ring-2 ring-emerald-500 scale-110 shadow-xl" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <IconShield className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <span className="text-sm font-black text-gray-900 block">Eco Mode</span>
                    <span className="text-[11px] text-gray-400 font-semibold block">100% Plant Safe</span>
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

              {/* Badge 3: Sneaker Spa */}
              <div
                onMouseEnter={() => setActiveFeatureHover("sneaker-spa")}
                onMouseLeave={() => setActiveFeatureHover(null)}
                className={`bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-gray-100 flex items-center gap-3.5 hover:scale-115 hover:shadow-2xl transition-all duration-300 cursor-pointer ${
                  activeFeatureHover === "sneaker-spa" ? "ring-2 ring-purple-500 scale-110 shadow-xl" : ""
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <IconFootprints className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <span className="text-sm font-black text-gray-900 block">Sneaker Spa</span>
                  <span className="text-[11px] text-gray-400 font-semibold block">Deep Sole Scrub & UV</span>
                </div>
              </div>

              {/* Badge 4: Zero Lost Clothes */}
              <div
                onMouseEnter={() => setActiveFeatureHover("zero-loss")}
                onMouseLeave={() => setActiveFeatureHover(null)}
                className={`bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-gray-100 flex items-center gap-3.5 hover:scale-115 hover:shadow-2xl transition-all duration-300 cursor-pointer ${
                  activeFeatureHover === "zero-loss" ? "ring-2 ring-amber-500 scale-110 shadow-xl" : ""
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="text-2xl">🛡️</span>
                </div>
                <div>
                  <span className="text-sm font-black text-gray-900 block">Zero Loss QA</span>
                  <span className="text-[11px] text-gray-400 font-semibold block">Barcode QR Tagged</span>
                </div>
              </div>
            </div>

            {/* Real iPhone 15 Pro with QuickPress Live Order Tracking */}
            <div className="relative z-10 flex justify-center">
              <IPhone15OrderTracking
                onOpenBooking={() => handleServiceClick()}
                onShowToast={onShowToast}
              />
            </div>

            {/* Desktop Right Column Floating Badges */}
            <div className="hidden lg:flex flex-col gap-6 absolute right-0 top-1/2 -translate-y-1/2 z-20 w-60 text-left">
              {/* Badge 5: Italian Steam Press */}
              <div
                onMouseEnter={() => setActiveFeatureHover("steam-press")}
                onMouseLeave={() => setActiveFeatureHover(null)}
                className={`bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-gray-100 flex items-center gap-3.5 hover:scale-115 hover:shadow-2xl transition-all duration-300 cursor-pointer ${
                  activeFeatureHover === "steam-press" ? "ring-2 ring-amber-500 scale-110 shadow-xl" : ""
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <IconIron className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <span className="text-sm font-black text-gray-900 block">Steam Press</span>
                  <span className="text-[11px] text-gray-400 font-semibold block">Italian Vacuum Former</span>
                </div>
              </div>

              {/* Badge 6: Offers & VIP Club */}
              <div
                onMouseEnter={() => setActiveFeatureHover("offers")}
                onMouseLeave={() => setActiveFeatureHover(null)}
                className={`bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-gray-100 flex items-center gap-3.5 hover:scale-115 hover:shadow-2xl transition-all duration-300 cursor-pointer ${
                  activeFeatureHover === "offers" ? "ring-2 ring-blue-500 scale-110 shadow-xl" : ""
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="text-2xl">🏷️</span>
                </div>
                <div>
                  <span className="text-sm font-black text-gray-900 block">Offers & Rewards</span>
                  <span className="text-[11px] text-blue-600 font-bold block">Up to 25% Savings</span>
                </div>
              </div>

              {/* Badge 7: Live GPS Route */}
              <div
                onMouseEnter={() => setActiveFeatureHover("gps-route")}
                onMouseLeave={() => setActiveFeatureHover(null)}
                className={`bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-gray-100 flex items-center gap-3.5 hover:scale-115 hover:shadow-2xl transition-all duration-300 cursor-pointer ${
                  activeFeatureHover === "gps-route" ? "ring-2 ring-emerald-500 scale-110 shadow-xl" : ""
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <IconVan className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <span className="text-sm font-black text-gray-900 block">Live GPS Telemetry</span>
                  <span className="text-[11px] text-gray-400 font-semibold block">Sub-12 Min Tracking</span>
                </div>
              </div>

              {/* Badge 8: Express 4-Hour */}
              <div
                onMouseEnter={() => setActiveFeatureHover("express")}
                onMouseLeave={() => setActiveFeatureHover(null)}
                className={`bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-gray-100 flex items-center gap-3.5 hover:scale-115 hover:shadow-2xl transition-all duration-300 cursor-pointer ${
                  activeFeatureHover === "express" ? "ring-2 ring-emerald-500 scale-110 shadow-xl" : ""
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <IconBolt className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <span className="text-sm font-black text-gray-900 block">Express 4-Hour</span>
                  <span className="text-[11px] text-gray-400 font-semibold block">Same-Day Wardrobe</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Feature Badges Grid */}
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

      {/* ─── 4. Email Link Dispatch Tool ─────────────────────────────────────────────── */}
      <section className="py-12 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
            Instant Email Dispatch
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-gray-950 mt-2 mb-2">
            Receive Download Links Directly in Your Inbox
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 max-w-lg mx-auto mb-6">
            Enter your email address to get direct APK download links for Customer, Partner & Captain apps sent immediately.
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

      {/* ─── 5. "Download the app now!" QR Card (Screenshot 5 - Green Theme at Page End) ─ */}
      <section className="py-16 sm:py-24 bg-white border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-[36px] bg-gradient-to-r from-emerald-50/70 via-emerald-50/30 to-white border border-emerald-100 p-8 sm:p-12 lg:p-14 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 sm:gap-12">
            {/* Background Aesthetic Waves */}
            <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full border border-emerald-200/40 pointer-events-none" />
            <div className="absolute -right-10 -top-10 w-96 h-96 rounded-full border border-emerald-200/20 pointer-events-none" />
            <div className="absolute -right-32 -bottom-20 w-[420px] h-[420px] rounded-full border border-emerald-200/30 pointer-events-none" />

            {/* Left Content Column */}
            <div className="md:w-7/12 space-y-4 text-center md:text-left relative z-10">
              <h2 className="text-3xl sm:text-5xl font-black text-gray-950 tracking-tight leading-[1.12]">
                Download the app now!
              </h2>

              <p className="text-sm sm:text-lg text-gray-600 leading-relaxed max-w-md">
                Experience seamless online laundry & garment care only on the QuickPress app
              </p>

              {/* Store Download Badges (Google Play + App Store in Green Accents) */}
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

            {/* Right Smartphone Screen Mockup with QR Code (Green Finder Markers!) */}
            <div className="md:w-5/12 flex justify-center relative z-10">
              <div className="relative w-64 sm:w-72 rounded-t-[36px] pt-4 px-4 bg-gray-900 shadow-2xl border-4 border-b-0 border-gray-800 -mb-14">
                {/* Speaker Notch */}
                <div className="w-20 h-3.5 bg-gray-950 rounded-full mx-auto mb-4" />

                <div className="bg-white rounded-2xl p-4 sm:p-5 text-center shadow-inner border border-gray-100">
                  <span className="text-xs font-bold text-gray-700 block mb-3 leading-tight">
                    Scan the QR code to <br />download the app
                  </span>

                  {/* Pixel-Perfect Authentic QR Code with Emerald Green Finders */}
                  <div className="p-3 bg-white rounded-2xl border border-gray-200/90 shadow-xs inline-block">
                    <svg
                      className="w-36 h-36 sm:w-40 sm:h-40"
                      viewBox="0 0 140 140"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {/* Top-Left Finder in Emerald Green */}
                      <rect x="10" y="10" width="36" height="36" rx="8" stroke="#1A7A3C" strokeWidth="6" fill="white" />
                      <rect x="22" y="22" width="12" height="12" rx="3" fill="#1A7A3C" />

                      {/* Top-Right Finder in Emerald Green */}
                      <rect x="94" y="10" width="36" height="36" rx="8" stroke="#1A7A3C" strokeWidth="6" fill="white" />
                      <rect x="106" y="22" width="12" height="12" rx="3" fill="#1A7A3C" />

                      {/* Bottom-Left Finder in Emerald Green */}
                      <rect x="10" y="94" width="36" height="36" rx="8" stroke="#1A7A3C" strokeWidth="6" fill="white" />
                      <rect x="22" y="106" width="12" height="12" rx="3" fill="#1A7A3C" />

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

      {/* Area Unavailable Notification & Waitlist Modal */}
      <AreaUnavailableModal
        isOpen={isUnavailableModalOpen}
        cityName={unavailableCityName || selectedLocation}
        onClose={() => setIsUnavailableModalOpen(false)}
        onSwitchToKasganj={handleSwitchToKasganj}
        onShowToast={onShowToast}
      />
    </div>
  );
}
