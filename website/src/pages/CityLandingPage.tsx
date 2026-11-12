import React, { useState } from "react";
import { ModalType } from "@/types";
import {
  IconCheck,
  IconMapPin,
  IconArrowRight,
  IconIron,
  IconFootprints,
  IconShield,
  IconBolt,
  IconSparkle,
} from "@/components/Icons";
import { handleGetStartedRedirect } from "@/utils/storeRedirect";

interface CityLandingPageProps {
  onOpenModal: (modal: ModalType) => void;
  serviceFocus?: "laundry" | "dry-cleaning" | "steam-iron" | "shoe-cleaning";
  cityName?: string;
}

// Comprehensive Locality Mappings for Major Indian Cities & Metros
const CITY_LOCALITIES: Record<string, string[]> = {
  delhi: [
    "Connaught Place",
    "South Extension",
    "Hauz Khas",
    "Saket",
    "Dwarka",
    "Rohini",
    "Vasant Kunj",
    "Lajpat Nagar",
    "Karol Bagh",
    "Pitampura",
    "Janakpuri",
    "Mayur Vihar",
  ],
  noida: [
    "Sector 18",
    "Sector 62",
    "Sector 137",
    "Sector 76",
    "Sector 50",
    "Sector 150",
    "Greater Noida West",
    "Noida Expressway",
    "Sector 128",
    "Sector 104",
  ],
  gurgaon: [
    "Cyber City",
    "DLF Phase 1-5",
    "Golf Course Road",
    "Sohna Road",
    "Sector 56",
    "Sushant Lok",
    "MG Road",
    "Sector 48",
    "Golf Course Extension",
  ],
  mumbai: [
    "Bandra West",
    "Andheri West",
    "Juhu",
    "Powai",
    "Colaba",
    "Lower Parel",
    "Dadar",
    "Malad West",
    "Thane West",
    "Navi Mumbai",
    "Borivali",
    "Ghatkopar",
  ],
  bangalore: [
    "Koramangala",
    "Indiranagar",
    "HSR Layout",
    "Whitefield",
    "Electronic City",
    "Marathahalli",
    "Bellandur",
    "JP Nagar",
    "Jayanagar",
    "Sarjapur Road",
  ],
  bengaluru: [
    "Koramangala",
    "Indiranagar",
    "HSR Layout",
    "Whitefield",
    "Electronic City",
    "Marathahalli",
    "Bellandur",
    "JP Nagar",
    "Jayanagar",
    "Sarjapur Road",
  ],
  hyderabad: [
    "Gachibowli",
    "Hitec City",
    "Madhapur",
    "Jubilee Hills",
    "Banjara Hills",
    "Kondapur",
    "Kukatpally",
    "Secunderabad",
    "Begumpet",
    "Manikonda",
  ],
  pune: [
    "Kothrud",
    "Viman Nagar",
    "Baner",
    "Wakad",
    "Hinjawadi",
    "Koregaon Park",
    "Aundh",
    "Hadapsar",
    "Magarpatta",
    "Kalyani Nagar",
  ],
  lucknow: [
    "Gomti Nagar",
    "Hazratganj",
    "Alambagh",
    "Indira Nagar",
    "Mahanagar",
    "Aliganj",
    "Ashiyana",
    "Chowk",
    "Vibhuti Khand",
    "Jankipuram",
  ],
  jaipur: [
    "Malviya Nagar",
    "Vaishali Nagar",
    "C-Scheme",
    "Mansarovar",
    "Raja Park",
    "Tonk Road",
    "Vidhyadhar Nagar",
    "Civil Lines",
    "Jagatpura",
  ],
  chandigarh: [
    "Sector 17",
    "Sector 35",
    "Sector 22",
    "Sector 8",
    "Mohali Phase 7",
    "Panchkula Sector 20",
    "Zirakpur",
    "Sector 43",
  ],
  kolkata: [
    "Salt Lake",
    "New Town",
    "Park Street",
    "Ballygunge",
    "Alipore",
    "Gariahat",
    "Dum Dum",
    "Rajarhat",
    "Behala",
    "Howrah",
  ],
  kasganj: [
    "Soron Gate",
    "Railway Station Road",
    "Bilram Gate",
    "Housing Board Colony",
    "Kaliyanpur",
    "Ashok Nagar",
    "Gandhi Murti",
    "Prabhu Park",
    "Ganjdundwara Road",
    "Mission Compound",
    "Nadarai Gate",
    "Chungi Chauraha",
  ],
  aligarh: [
    "Civil Lines",
    "Center Point",
    "Ramghat Road",
    "Medical College Road",
    "Marris Road",
    "Swarna Jayanti Nagar",
    "GT Road",
    "Quarsi",
  ],
  agra: [
    "Sanjay Place",
    "Fatehabad Road",
    "Kamla Nagar",
    "Dayalbagh",
    "Shahganj",
    "Sikandra",
    "Tajganj",
    "Khandari",
  ],
};

const DEFAULT_LOCALITIES = [
  "City Center",
  "Commercial District",
  "IT & Business Park Zone",
  "Civil Lines",
  "Sector 1 to 25",
  "Main Market Area",
  "Residential Enclaves",
  "Railway Station Corridor",
  "University Campus Area",
  "Expressway & Bypass Road",
];

const LOCAL_SERVICES = [
  {
    id: "wash-fold",
    title: "Doorstep Wash & Fold Laundry",
    price: "From ₹49 / kg",
    turnaround: "24 Hours (Express 4h available)",
    highlight: "RO-water washed with hypoallergenic eco-detergents, tumble-dried, and neatly folded.",
    tag: "Most Popular",
  },
  {
    id: "steam-iron",
    title: "Italian High-Pressure Steam Ironing",
    price: "From ₹9 / piece",
    turnaround: "12 - 24 Hours",
    highlight: "Industrial Italian vacuum-bed dry steam pressing for sharp, wrinkle-free creases with zero fabric scorch.",
    tag: "Daily Essential",
  },
  {
    id: "dry-cleaning",
    title: "Italian Hydrocarbon Dry Cleaning",
    price: "From ₹149 / piece",
    turnaround: "48 Hours Guaranteed",
    highlight: "100% perchloroethylene-free solvent care for suits, silk sarees, blazers, and wedding lehengas.",
    tag: "Fabric Safe",
  },
  {
    id: "shoe-spa",
    title: "Sneaker & Footwear Restoration Spa",
    price: "From ₹199 / pair",
    turnaround: "48 - 72 Hours",
    highlight: "Multi-stage foam scrub, sole groove disinfection, suede nap revival, and hydrophobic moisture barrier.",
    tag: "Deep Restoration",
  },
  {
    id: "blanket-care",
    title: "Double Blanket, Razai & Quilt Care",
    price: "From ₹199 / piece",
    turnaround: "48 Hours",
    highlight: "Heavy-duty 35kg commercial drum sanitization removes dust mites, allergens, and odors.",
    tag: "Seasonal Care",
  },
  {
    id: "b2b-contract",
    title: "Commercial Institutional Laundry",
    price: "Volume Contract Rates",
    turnaround: "Scheduled Daily Logistics",
    highlight: "NABH-compliant linen washing and uniform care for hotels, hospitals, gyms, and corporate offices.",
    tag: "Enterprise B2B",
  },
];

function formatCityDisplay(raw: string): string {
  if (!raw) return "All India";
  const cleaned = raw.trim().replace(/-/g, " ");
  return cleaned
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function CityLandingPage({ onOpenModal, serviceFocus = "laundry", cityName = "All India" }: CityLandingPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const displayCity = formatCityDisplay(cityName);
  const cityKey = (cityName || "").toLowerCase().replace(/[^a-z]/g, "");
  const activeAreas = CITY_LOCALITIES[cityKey] || DEFAULT_LOCALITIES;

  const isNational = !cityName || cityKey === "allindia" || cityKey === "india";

  const getH1 = () => {
    const locText = isNational ? "in India" : `in ${displayCity}`;
    switch (serviceFocus) {
      case "dry-cleaning":
        return `Best Dry Cleaning Service ${locText} — Free Doorstep Pickup`;
      case "steam-iron":
        return `Best Steam Ironing Service ${locText} — 15-Minute Pickup`;
      case "shoe-cleaning":
        return `Best Sneaker & Shoe Spa ${locText} — Deep Restoration`;
      default:
        return `Best Laundry & Dry Cleaning Service ${locText} — Doorstep Pickup`;
    }
  };

  const getSubtitle = () => {
    const locText = isNational ? "across India" : `across ${displayCity}`;
    switch (serviceFocus) {
      case "dry-cleaning":
        return `Italian hydrocarbon eco dry cleaning for suits, silk sarees, blazers, and wedding wear with 15-minute doorstep pickup and 48-hour delivery ${locText}.`;
      case "steam-iron":
        return `Industrial Italian vacuum-bed dry steam pressing for crisp, razor-sharp creases with zero scorch risk. Fast 12 to 24-hour return delivery ${locText}.`;
      case "shoe-cleaning":
        return `Professional footwear restoration, sole disinfection, suede nap revival, and water-repellent coating for sneakers, sports shoes, and leather formals ${locText}.`;
      default:
        return `QuickPress is India's leading on-demand hyper-local laundry and garment care marketplace. 15-minute doorstep collection, hygienic RO water washing, steam iron, and 24-hour delivery ${locText}.`;
    }
  };

  const faqs = [
    {
      q: `How fast is QuickPress laundry pickup ${isNational ? "in my city" : `in ${displayCity}`}?`,
      a: `Our trained delivery captain arrives at your doorstep within 15 minutes of booking ${isNational ? "across covered cities in India" : `in ${displayCity}`}, or at your selected scheduled time slot.`,
    },
    {
      q: `Do you charge extra for doorstep pickup and delivery ${isNational ? "in India" : `in ${displayCity}`}?`,
      a: "No! QuickPress offers transparent per-kg and per-piece rates with free doorstep collection and delivery across all primary residential and commercial areas.",
    },
    {
      q: `Which localities ${isNational ? "are covered by QuickPress" : `in ${displayCity} do you cover`}?`,
      a: isNational
        ? "We operate across major metros and urban hubs including Delhi NCR, Mumbai, Bangalore, Hyderabad, Pune, Lucknow, Jaipur, Chandigarh, Kasganj, and are rapidly expanding pan-India."
        : `We cover all major neighborhoods across ${displayCity} including ${activeAreas.slice(0, 6).join(", ")}, and surrounding districts.`,
    },
    {
      q: "Are my expensive silk sarees, suits, and designer wear safe?",
      a: "Yes, 100%. QuickPress uses Italian hydrocarbon dry cleaning that is completely free of perchloroethylene, protecting natural silk proteins, zari, and delicate embroidery without chemical odors or fabric degradation.",
    },
    {
      q: "Does QuickPress provide commercial B2B contracts for hotels and hospitals?",
      a: "Yes! QuickPress Enterprise provides high-capacity institutional laundry contracts with dedicated daily logistics, GST billing, and NABH-compliant sanitization protocols across India.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pt-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/70 via-white to-slate-50 py-16 md:py-24 border-b border-slate-200/80">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center text-center">
            {/* National / Local Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100/70 px-4 py-1.5 text-xs font-bold text-emerald-900 shadow-2xs mb-6">
              <IconMapPin className="size-3.5 text-emerald-700" />
              <span>
                {isNational
                  ? "India's #1 On-Demand Garment Care Network • Pan-India Doorstep Dispatch"
                  : `${displayCity} Verified Hub • 15-Minute Doorstep Dispatch`}
              </span>
            </div>

            {/* Main H1 */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-950 max-w-4xl leading-tight">
              {getH1()}
            </h1>

            {/* Subtitle */}
            <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl font-medium leading-relaxed">
              {getSubtitle()}
            </p>

            {/* Key Trust Highlights */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                <IconCheck className="size-3.5 text-emerald-600" /> 15-Min Doorstep Pickup
              </span>
              <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                <IconCheck className="size-3.5 text-emerald-600" /> 100% RO Water Wash
              </span>
              <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                <IconCheck className="size-3.5 text-emerald-600" /> 4-Digit Security OTP
              </span>
              <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                <IconCheck className="size-3.5 text-emerald-600" /> Rated 4.9/5 Across India
              </span>
            </div>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleGetStartedRedirect}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-7 py-3.5 text-sm font-bold text-white shadow-md hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
              >
                <span>Book Doorstep Pickup Now</span>
                <IconArrowRight className="size-4" />
              </button>
              <a
                href={`https://wa.me/919258730561?text=${encodeURIComponent(
                  `Hi QuickPress, I want to book a laundry pickup in ${displayCity}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-bold text-slate-800 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all"
              >
                <span>WhatsApp Booking (+91 9258730561)</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Coverage Map & Localities */}
      <section className="py-12 bg-white border-b border-slate-200/80">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-black text-slate-950">
              {isNational
                ? "Active Metro & Regional Operating Hubs Across India"
                : `Active Doorstep Pickup Zones in ${displayCity}`}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {isNational
                ? "Our certified laundromat partners and delivery captains provide seamless doorstep service in key Indian urban hubs."
                : `Our delivery fleet operates throughout ${displayCity} with guaranteed 15-minute collection response.`}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-2 sm:gap-3 max-w-4xl mx-auto">
            {activeAreas.map((area) => (
              <span
                key={area}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-800"
              >
                <IconMapPin className="size-3 text-emerald-600" />
                <span>{area}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Services & Live Pricing Table */}
      <section className="py-16 bg-slate-50 border-b border-slate-200/80">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Transparent National Rates</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-black text-slate-950">
              {displayCity} Service Menu & Delivery Timelines
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Zero hidden fees. We weigh and inspect garments right at your doorstep before issuing digital receipt.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {LOCAL_SERVICES.map((s) => (
              <div
                key={s.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-100">
                      {s.tag}
                    </span>
                    <span className="text-xs font-medium text-slate-500">{s.turnaround}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-black text-slate-950">{s.title}</h3>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">{s.highlight}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-base font-black text-emerald-700">{s.price}</div>
                  <button
                    type="button"
                    onClick={handleGetStartedRedirect}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 hover:text-emerald-700 cursor-pointer"
                  >
                    <span>Book</span>
                    <IconArrowRight className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How QuickPress Works */}
      <section className="py-16 bg-white border-b border-slate-200/80">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Simple 3-Step Process</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-black text-slate-950">
              How Doorstep Laundry Works {isNational ? "Across India" : `in ${displayCity}`}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-6 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 font-black text-lg mb-4">
                1
              </div>
              <h3 className="text-base font-black text-slate-950">Schedule Pickup</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Choose your required care vertical and time slot on withquickpress.com or the Android App.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-6 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 font-black text-lg mb-4">
                2
              </div>
              <h3 className="text-base font-black text-slate-950">15-Min Collection & Washing</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Delivery captain collects clothes with OTP verification. Garments undergo RO wash & Italian pressing.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-6 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 font-black text-lg mb-4">
                3
              </div>
              <h3 className="text-base font-black text-slate-950">Fresh Doorstep Delivery</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Clothes delivered neatly packed, crisp, and fresh within 24 to 48 hours right to your door.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Local FAQs Accordion */}
      <section className="py-16 bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Got Questions?</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-black text-slate-950">
              {displayCity} Laundry Service FAQs
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={faq.q}
                  className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between p-4 sm:p-5 text-left text-sm sm:text-base font-bold text-slate-900 cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <span className="ml-3 shrink-0 text-emerald-600 text-lg font-black">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-600 font-normal leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom CTA Banner */}
          <div className="mt-12 rounded-2xl bg-gradient-to-r from-emerald-800 to-emerald-950 p-8 text-center text-white shadow-lg">
            <h3 className="text-xl sm:text-2xl font-black">
              Ready for Fresh, Clean Clothes {isNational ? "in India" : `in ${displayCity}`}?
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-emerald-100 max-w-xl mx-auto">
              Schedule your doorstep pickup in 60 seconds. Our delivery captain will arrive at your home within 15 minutes!
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={handleGetStartedRedirect}
                className="rounded-xl bg-white px-6 py-3 text-xs sm:text-sm font-bold text-emerald-950 hover:bg-emerald-50 active:scale-95 transition-all cursor-pointer"
              >
                Book Doorstep Pickup
              </button>
              <a
                href="tel:+919258730561"
                className="rounded-xl border border-emerald-400/40 bg-emerald-900/60 px-6 py-3 text-xs sm:text-sm font-bold text-white hover:bg-emerald-900 active:scale-95 transition-all"
              >
                Call Support: +91 9258730561
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
