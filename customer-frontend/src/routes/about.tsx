import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  HeartHandshake,
  Leaf,
  MapPin,
  Scale,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — QuickPress Laundry & Dry Cleaning" },
      {
        name: "description",
        content:
          "Learn how QuickPress is redefining laundry care with door-to-door pickup, fabric-safe eco detergents, sanitized facilities, and fast turnaround.",
      },
    ],
  }),
  component: AboutScreen,
});

function AboutScreen() {
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-none bg-white/90 backdrop-blur-md rounded-b-2xl sm:rounded-b-3xl shadow-[0_3px_12px_-2px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/home"
              className="inline-flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-xs transition hover:bg-slate-50"
              aria-label="Back to home"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <span className="text-base font-black tracking-tight text-slate-900">
                Quick<span className="text-emerald-600">Press</span>
              </span>
              <span className="ml-2 text-xs font-semibold text-slate-400">About Our Mission</span>
            </div>
          </div>

          <Link
            to="/home"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
          >
            Book Pickup <ArrowRight className="size-3" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white border-b border-slate-200 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-700">
              <Sparkles className="size-3.5" />
              Next-Gen Doorstep Garment Care
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-[1.15]">
              Redefining laundry with speed, hygiene, and complete care.
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              QuickPress was founded to free everyday households and busy professionals from the hassle of weekend laundry. By pairing neighborhood partner laundromats with a swift rider fleet, we deliver spotless, crisply pressed clothes right to your door.
            </p>
          </div>
        </div>
      </section>

      {/* Core Values / Why Choose Us */}
      <section className="py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Why Customers Trust QuickPress</h2>
            <p className="text-sm text-slate-500">Every garment is treated with tailored care cycles, zero toxic solvents, and strict hygienic protocols.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
              <div className="inline-flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Truck className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Doorstep Pickup & Drop</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Schedule a pickup in seconds. Our verified riders collect your clothes right at your door and return them fresh within 24–48 hours.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
              <div className="inline-flex size-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <Leaf className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Eco-Friendly Care</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                We use hypoallergenic, biodegradable detergents that preserve fabric colors, protect skin, and reduce environmental impact.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
              <div className="inline-flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Scale className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Transparent Weight & Pricing</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                No hidden fees. Clothes are weighed and counted in front of you with digital scales and instant receipts sent to your phone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works / The Journey */}
      <section className="bg-white border-y border-slate-200 py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">The 4-Step QuickPress Standard</h2>
            <p className="text-sm text-slate-500">From your wardrobe back to your wardrobe, fresh and crisp.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="relative rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-2">
              <span className="text-3xl font-black text-emerald-600">01</span>
              <h4 className="font-bold text-slate-900 text-sm">Schedule Online</h4>
              <p className="text-xs text-slate-600">Choose your wash/dry cleaning items and select a convenient pickup time slot.</p>
            </div>

            <div className="relative rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-2">
              <span className="text-3xl font-black text-emerald-600">02</span>
              <h4 className="font-bold text-slate-900 text-sm">Doorstep Handover</h4>
              <p className="text-xs text-slate-600">Our rider verifies the count, inspects garments, and seals them in protective bags.</p>
            </div>

            <div className="relative rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-2">
              <span className="text-3xl font-black text-emerald-600">03</span>
              <h4 className="font-bold text-slate-900 text-sm">Master Care Cycle</h4>
              <p className="text-xs text-slate-600">Color-sorted washing, stain pre-treatment, temperature regulation, and crisp steam iron.</p>
            </div>

            <div className="relative rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-2">
              <span className="text-3xl font-black text-emerald-600">04</span>
              <h4 className="font-bold text-slate-900 text-sm">Fresh Delivery</h4>
              <p className="text-xs text-slate-600">Neatly folded or hung garments delivered back to your doorstep in pristine condition.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Safety & Hygiene Pledge */}
      <section className="py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-8 sm:p-12 text-white">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-emerald-300">
                <ShieldCheck className="size-4" /> 100% Sanitized Promise
              </div>
              <h2 className="text-2xl sm:text-3xl font-black">Never mixed. Sanitized machines. Pure care.</h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Your garments are never mixed with anyone else's clothes. Every machine drum is sanitized between loads, and our partner hubs adhere strictly to ISO quality standards.
              </p>
              <div className="pt-2 flex flex-wrap gap-4">
                <Link
                  to="/home"
                  className="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
                >
                  Experience QuickPress
                </Link>
                <Link
                  to="/contact"
                  className="rounded-xl border border-white/20 px-5 py-2.5 text-xs font-semibold text-white hover:bg-white/10 transition"
                >
                  Partner With Us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
