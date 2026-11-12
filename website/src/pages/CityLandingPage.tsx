import React, { useState } from "react";
import { ModalType } from "@/types";
import {
  IconCheck,
  IconSparkle,
  IconMapPin,
  IconArrowRight,
  IconIron,
  IconFootprints,
  IconShield,
  IconBolt,
} from "@/components/Icons";
import { handleGetStartedRedirect } from "@/utils/storeRedirect";

interface CityLandingPageProps {
  onOpenModal: (modal: ModalType) => void;
  serviceFocus?: "laundry" | "dry-cleaning" | "steam-iron" | "shoe-cleaning";
}

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
];

const FAQS = [
  {
    q: "How fast is QuickPress laundry pickup in Kasganj?",
    a: "Our trained delivery captain arrives at your doorstep within 15 minutes of booking anywhere in Kasganj, or at your selected scheduled time slot.",
  },
  {
    q: "Do you charge extra for doorstep pickup and delivery in Kasganj?",
    a: "No! QuickPress offers transparent rates with free doorstep collection and delivery across all primary residential and commercial areas in Kasganj.",
  },
  {
    q: "Which localities in Kasganj do you cover?",
    a: "We cover all major areas including Soron Gate, Bilram Gate, Railway Station Road, Housing Board Colony, Kaliyanpur, Ashok Nagar, Gandhi Murti, and surrounding neighborhoods.",
  },
  {
    q: "Are my expensive silk sarees and suits safe?",
    a: "Yes. We use 100% perchloroethylene-free Italian hydrocarbon dry cleaning that preserves natural silk proteins, zari, and delicate embroidery without chemical odor or fading.",
  },
  {
    q: "How do I book online laundry pickup?",
    a: "You can book directly on this website, tap WhatsApp (+91 9258730561), or download the QuickPress Android App. Booking takes less than 60 seconds.",
  },
];

export function CityLandingPage({ onOpenModal, serviceFocus = "laundry" }: CityLandingPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const getH1 = () => {
    switch (serviceFocus) {
      case "dry-cleaning":
        return "Best Dry Cleaning Service in Kasganj — Free Doorstep Pickup";
      case "steam-iron":
        return "Best Steam Ironing Service in Kasganj — 15-Minute Pickup";
      case "shoe-cleaning":
        return "Best Sneaker & Shoe Spa in Kasganj — Deep Restoration";
      default:
        return "Best Laundry & Dry Cleaning Service in Kasganj — Doorstep Pickup";
    }
  };

  const getSubtitle = () => {
    switch (serviceFocus) {
      case "dry-cleaning":
        return "Italian hydrocarbon eco dry cleaning for suits, silk sarees, blazers, and wedding wear with 15-minute doorstep pickup and 48-hour delivery across Kasganj.";
      case "steam-iron":
        return "Industrial Italian vacuum-bed dry steam pressing for crisp, razor-sharp creases with zero scorch risk. Fast 12 to 24-hour return delivery.";
      case "shoe-cleaning":
        return "Professional footwear restoration, sole disinfection, suede nap revival, and water-repellent coating for sneakers, sports shoes, and leather formals.";
      default:
        return "QuickPress is Kasganj's #1 on-demand laundry and garment care service. 15-minute doorstep pickup, hygienic RO-purified water washing, steam iron, and 24-hour fast delivery.";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pt-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/70 via-white to-slate-50 py-16 md:py-24 border-b border-slate-200/80">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center text-center">
            {/* Local Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100/70 px-4 py-1.5 text-xs font-bold text-emerald-900 shadow-2xs mb-6">
              <IconMapPin className="size-3.5 text-emerald-700" />
              <span>Kasganj Primary Flagship Hub • 15-Min Doorstep Dispatch</span>
            </div>

            {/* Main Local H1 */}
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
                <IconCheck className="size-3.5 text-emerald-600" /> 15-Min Pickup
              </span>
              <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                <IconCheck className="size-3.5 text-emerald-600" /> 100% RO Water Wash
              </span>
              <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                <IconCheck className="size-3.5 text-emerald-600" /> 4-Digit Security OTP
              </span>
              <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                <IconCheck className="size-3.5 text-emerald-600" /> Rated 4.9/5 by 1,280+ Customers
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
                href="https://wa.me/919258730561?text=Hi%20QuickPress,%20I%20want%20to%20book%20a%20laundry%20pickup%20in%20Kasganj"
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

      {/* Local Coverage Map & Zones */}
      <section className="py-12 bg-white border-b border-slate-200/80">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-black text-slate-950">
              Active Doorstep Pickup Zones in Kasganj
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Our delivery fleet operates throughout Kasganj with guaranteed 15-minute collection response.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-2 sm:gap-3 max-w-4xl mx-auto">
            {LOCAL_AREAS.map((area) => (
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
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Transparent Local Rates</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-black text-slate-950">
              Kasganj Service Menu & Delivery Timelines
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
              How Doorstep Laundry Works in Kasganj
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

      {/* Local Kasganj FAQs Accordion */}
      <section className="py-16 bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Got Questions?</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-black text-slate-950">
              Kasganj Laundry Service FAQs
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
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
            <h3 className="text-xl sm:text-2xl font-black">Ready for Fresh, Clean Clothes in Kasganj?</h3>
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
