import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Flame,
  Footprints,
  MapPin,
  Phone,
  ShieldCheck,
  Shirt,
  Sparkles,
  Star,
  Truck,
  WashingMachine,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/laundry-service-in-kasganj")({
  head: () => ({
    meta: [
      { title: "Best Laundry & Dry Cleaning Service in Kasganj — Free Doorstep Pickup | QuickPress" },
      {
        name: "description",
        content:
          "Looking for the best laundry service in Kasganj? QuickPress offers 15-minute doorstep pickup, RO water wash, Italian eco dry cleaning, and 24h delivery. Book now starting at ₹49/kg!",
      },
      {
        name: "keywords",
        content:
          "laundry service Kasganj, dry cleaners in Kasganj, best laundry Kasganj, doorstep laundry pickup Kasganj, steam iron Kasganj, wash and fold per kg, shoe cleaning Kasganj, QuickPress laundry",
      },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "QuickPress" },
      { property: "og:url", content: "https://withquickpress.com/laundry-service-in-kasganj" },
      {
        property: "og:title",
        content: "Best Laundry & Dry Cleaning in Kasganj (Doorstep Pickup & 24h Delivery)",
      },
      {
        property: "og:description",
        content: "15-minute collection across Kasganj. RO-water wash, Italian dry clean, steam iron, and sneaker spa.",
      },
      { property: "og:image", content: "https://withquickpress.com/og-image.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "geo.region", content: "IN-UP" },
      { name: "geo.placename", content: "Kasganj" },
      { name: "geo.position", content: "27.8083;78.6453" },
      { name: "ICBM", content: "27.8083, 78.6453" },
    ],
    links: [
      { rel: "canonical", href: "https://withquickpress.com/laundry-service-in-kasganj" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "DryCleaningOrLaundry",
          "name": "QuickPress Laundry & Dry Cleaning Kasganj",
          "url": "https://withquickpress.com/laundry-service-in-kasganj",
          "telephone": "+919258730561",
          "priceRange": "₹29 - ₹499",
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "reviewCount": "1280",
            "bestRating": "5",
            "worstRating": "1"
          },
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "0, Jail Road, Nagla Beni, Near Gadda Factory, Kaliyanpur",
            "addressLocality": "Kasganj",
            "addressRegion": "Uttar Pradesh",
            "postalCode": "207123",
            "addressCountry": "IN"
          },
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": 27.8083,
            "longitude": 78.6453
          },
          "areaServed": {
            "@type": "City",
            "name": "Kasganj"
          }
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "How fast is QuickPress laundry pickup in Kasganj?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "A QuickPress delivery captain arrives at your doorstep in Kasganj within 15 minutes of booking."
              }
            },
            {
              "@type": "Question",
              "name": "What are QuickPress laundry rates in Kasganj?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Wash & Fold starts at ₹49/kg, steam iron at ₹9/piece, and Italian dry cleaning at ₹149/piece."
              }
            }
          ]
        }),
      }
    ],
  }),
  component: KasganjLandingScreen,
});

const LOCAL_AREAS = [
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
];

function KasganjLandingScreen() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "How fast is QuickPress laundry pickup in Kasganj?",
      a: "Our trained delivery captain arrives at your doorstep within 15 minutes of booking anywhere in Kasganj.",
    },
    {
      q: "Do you charge extra for doorstep collection in Kasganj?",
      a: "No! QuickPress offers transparent rates with free doorstep collection and delivery across all primary localities.",
    },
    {
      q: "Which areas in Kasganj are covered?",
      a: "We cover all major neighborhoods including Soron Gate, Bilram Gate, Railway Station Road, Housing Board Colony, Kaliyanpur, Ashok Nagar, Gandhi Murti, and surrounding districts.",
    },
    {
      q: "Are my expensive silk sarees and suits safe?",
      a: "Yes. We use 100% perchloroethylene-free Italian hydrocarbon dry cleaning that protects silk proteins, zari, and delicate embroidery.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/home" className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-slate-950">
              Quick<span className="text-emerald-600">Press</span>
            </span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              Kasganj Hub
            </span>
          </Link>
          <Link
            to="/login"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
          >
            Book Now
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-emerald-50 via-white to-slate-50 py-12 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100/70 px-3.5 py-1 text-xs font-bold text-emerald-900 mb-4">
            <MapPin className="size-3 text-emerald-700" />
            <span>Serving All Kasganj Neighborhoods • 15-Min Doorstep Dispatch</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-950 leading-tight">
            Best Laundry & Dry Cleaning Service in Kasganj
          </h1>
          <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-xl mx-auto font-medium">
            15-minute doorstep pickup, hygienic RO-purified water washing, Italian hydrocarbon dry cleaning, and 24-hour fast delivery right to your door.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700 shadow-sm"
            >
              <span>Schedule Pickup in Kasganj</span>
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="https://wa.me/919258730561?text=Hi%20QuickPress,%20I%20want%20to%20book%20a%20laundry%20pickup%20in%20Kasganj"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 shadow-2xs hover:bg-slate-50"
            >
              <Phone className="size-4 text-emerald-600" />
              <span>WhatsApp (+91 9258730561)</span>
            </a>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3 text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded border border-slate-200">
              <CheckCircle2 className="size-3.5 text-emerald-600" /> 15-Min Pickup
            </span>
            <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded border border-slate-200">
              <CheckCircle2 className="size-3.5 text-emerald-600" /> RO Water Wash
            </span>
            <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded border border-slate-200">
              <CheckCircle2 className="size-3.5 text-emerald-600" /> 4-Digit Security OTP
            </span>
            <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded border border-slate-200">
              <Star className="size-3.5 text-amber-500 fill-amber-500" /> 4.9/5 Rating (1,280+ Reviews)
            </span>
          </div>
        </div>
      </section>

      {/* Local Areas Grid */}
      <section className="py-8 bg-white border-y border-slate-200">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-center text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">
            Active Pickup Localities in Kasganj
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {LOCAL_AREAS.map((area) => (
              <span
                key={area}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-800"
              >
                <MapPin className="size-3 text-emerald-600" />
                {area}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-12 max-w-5xl mx-auto px-4">
        <h2 className="text-center text-2xl font-black text-slate-950 mb-8">
          Kasganj Laundry & Garment Care Menu
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 mb-3">
              <WashingMachine className="size-5" />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-950">Wash & Fold Laundry</h3>
              <span className="text-xs font-black text-emerald-700">From ₹49/kg</span>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              RO water wash, hypoallergenic detergents, low-heat tumble dry, and neat folding in sealed bags.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 mb-3">
              <Flame className="size-5" />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-950">Italian Steam Ironing</h3>
              <span className="text-xs font-black text-emerald-700">From ₹9/pc</span>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              High-pressure industrial boiler dry steam pressing for sharp, wrinkle-free lines with zero scorch.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 mb-3">
              <Sparkles className="size-5" />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-950">Italian Dry Cleaning</h3>
              <span className="text-xs font-black text-emerald-700">From ₹149/pc</span>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              100% perchloroethylene-free solvent care for suits, silk sarees, and designer formal wear.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex size-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 mb-3">
              <Footprints className="size-5" />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-950">Sneaker & Shoe Spa</h3>
              <span className="text-xs font-black text-emerald-700">From ₹199/pair</span>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Multi-stage foam scrub, sole groove disinfection, suede nap revival, and hydrophobic finish.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 mb-3">
              <Shirt className="size-5" />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-950">Quilts & Blankets</h3>
              <span className="text-xs font-black text-emerald-700">From ₹199/pc</span>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Heavy-duty 35kg commercial drum sanitization removes dust mites, allergens, and odors from razais.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 mb-3">
                <Truck className="size-5" />
              </div>
              <h3 className="font-bold text-slate-950">Commercial B2B Laundry</h3>
              <p className="mt-2 text-xs text-slate-600">
                Dedicated daily pickup contracts for Kasganj hotels, clinics, gyms, and corporate uniforms.
              </p>
            </div>
            <a
              href="https://withquickpress.com/b2b"
              className="mt-4 text-xs font-bold text-emerald-700 hover:underline"
            >
              Explore B2B Portal →
            </a>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-12 max-w-3xl mx-auto px-4">
        <h2 className="text-center text-xl font-black text-slate-950 mb-6">
          Frequently Asked Questions in Kasganj
        </h2>
        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={faq.q}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs"
            >
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="flex w-full items-center justify-between text-left text-sm font-bold text-slate-900 cursor-pointer"
              >
                <span>{faq.q}</span>
                <span className="text-emerald-600 font-bold">{openFaq === idx ? "−" : "+"}</span>
              </button>
              {openFaq === idx && (
                <p className="mt-2 text-xs text-slate-600 font-normal leading-relaxed">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="max-w-3xl mx-auto px-4 mt-8">
        <div className="rounded-2xl bg-emerald-900 p-6 sm:p-8 text-center text-white">
          <h3 className="text-xl font-black">Experience Professional Laundry in Kasganj</h3>
          <p className="mt-2 text-xs sm:text-sm text-emerald-200">
            Book online in 60 seconds. Fresh, clean, and neatly packed garments delivered to your doorstep.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              to="/login"
              className="rounded-xl bg-white px-6 py-2.5 text-xs font-bold text-emerald-950 hover:bg-emerald-50 transition"
            >
              Book Doorstep Pickup
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

