import React, { useState } from "react";
import { ModalType } from "@/types";

interface StorePageProps {
  partnerId: string;
  onOpenModal: (modal: ModalType) => void;
  onShowToast: (msg: string) => void;
  onNavigateHome: () => void;
}

const STORE_SERVICES = [
  {
    id: "wash-fold",
    title: "Wash & Crisp Fold",
    price: "₹49 / kg",
    turnaround: "24 Hours",
    tagline: "Everyday clothes, gym wear, bedsheets & towels",
    details: [
      "RO-purified soft water wash",
      "Hypoallergenic botanical eco-detergents",
      "Low-heat tumble dry & neat origami fold",
      "Sealed moisture-resistant bio-packaging",
    ],
    badge: "Most Popular",
  },
  {
    id: "steam-press",
    title: "Steam Press & Hanger Care",
    price: "₹25 / piece",
    turnaround: "Same-Day",
    tagline: "Crisp shirts, trousers, suits & ethnic wear",
    details: [
      "High-pressure Italian steam vacuum table",
      "Zero burn & zero fabric shine guarantee",
      "Cardboard collar support & optional hangers",
      "Anti-wrinkle breathable dust cover",
    ],
    badge: "Express Available",
  },
  {
    id: "dry-clean",
    title: "Premium Hydrocarbon Dry Clean",
    price: "₹149 / piece",
    turnaround: "48 Hours",
    tagline: "Silk sarees, blazers, sherwanis & designer wear",
    details: [
      "Zero-perc eco-solvent gentle wash",
      "Individual ultrasonic spot extraction",
      "Fabric-safe color preservation treatment",
      "Sanitized steam finish & archival packaging",
    ],
    badge: "Specialist Care",
  },
  {
    id: "shoe-care",
    title: "Sneaker & Shoe Deep Restoration",
    price: "₹199 / pair",
    turnaround: "48-72 Hours",
    tagline: "Canvas, leather, suede & sports sneakers",
    details: [
      "Multi-step manual deep foam scrub",
      "Midsole unyellowing & lace wash",
      "Interior UV sterilization & deodorization",
      "Water-repellent nano-coat finish",
    ],
    badge: "Handcrafted",
  },
  {
    id: "heavy-linen",
    title: "Blankets, Quilts & Curtains",
    price: "₹249 / piece",
    turnaround: "48 Hours",
    tagline: "Heavy comforters, duvets, woolens & drapes",
    details: [
      "Industrial drum multi-rinse extraction",
      "80°C anti-mite & allergen thermal hygiene",
      "Fluff-restoration drying cycle",
      "Vacuum-compressed space-saving storage bag",
    ],
    badge: "Hygiene Certified",
  },
];

export function StorePage({
  partnerId,
  onOpenModal,
  onShowToast,
  onNavigateHome,
}: StorePageProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const canonicalStoreUrl = `https://withquickpress.com/store/${encodeURIComponent(partnerId)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(canonicalStoreUrl)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(canonicalStoreUrl);
      setCopiedLink(true);
      onShowToast("Store link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      onShowToast("Could not copy link");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `QuickPress Partner Store Hub (${partnerId})`,
          text: `Book verified laundry, dry cleaning & steam press directly from QuickPress Partner Hub (${partnerId}):`,
          url: canonicalStoreUrl,
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 pt-24 pb-20 font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
          <button
            type="button"
            onClick={onNavigateHome}
            className="hover:text-zinc-900 transition-colors cursor-pointer"
          >
            Home
          </button>
          <span>/</span>
          <span>Partner Stores</span>
          <span>/</span>
          <span className="text-zinc-900 font-bold uppercase">{partnerId}</span>
        </div>

        {/* Storefront Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-white border border-zinc-200/90 shadow-sm p-6 sm:p-10">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                <span className="size-2 rounded-full bg-emerald-600 animate-pulse" />
                <span>QuickPress Certified Partner Hub</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-zinc-950 tracking-tight">
                QuickPress Laundry &amp; Garment Care Hub
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-zinc-600">
                <span className="font-mono bg-zinc-100 px-2.5 py-1 rounded-lg text-zinc-900 border border-zinc-200">
                  Store ID: {partnerId}
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-bold">
                  ★ 5.0 (Verified Storefront)
                </span>
                <span className="text-zinc-500">•</span>
                <span>Doorstep Pickup in 45 Mins</span>
                <span className="text-zinc-500">•</span>
                <span>Hyper-Local Route Dispatch</span>
              </div>
            </div>

            {/* Top Quick Action */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onOpenModal("booking")}
                className="px-6 py-3.5 rounded-2xl bg-zinc-950 text-white font-black text-sm hover:bg-zinc-800 active:scale-95 transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                <span>Book Pickup Now</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* Value Badges Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-zinc-100">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Pickup Speed</p>
              <p className="text-sm font-black text-zinc-900">Under 45 Minutes</p>
              <p className="text-[11px] text-zinc-500">Live GPS courier dispatch</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Washing Standard</p>
              <p className="text-sm font-black text-zinc-900">80°C Thermal Hygiene</p>
              <p className="text-[11px] text-zinc-500">Anti-bacterial &amp; sanitised</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Eco-Solvents</p>
              <p className="text-sm font-black text-zinc-900">100% Plant Derived</p>
              <p className="text-[11px] text-zinc-500">Zero perchloroethylene</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Guarantee</p>
              <p className="text-sm font-black text-zinc-900">100% Loss-Free</p>
              <p className="text-[11px] text-zinc-500">Barcode tag custody seal</p>
            </div>
          </div>
        </div>

        {/* 2-Column Content: Left = Rate Card / Services, Right = QR Standee & Smart App Deep Link */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: Services & Rate Card (2 Cols) */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
              <div>
                <h2 className="text-lg font-black text-zinc-950">Store Services &amp; Rate Card</h2>
                <p className="text-xs text-zinc-500 font-medium">All prices include doorstep pickup, processing, and return delivery</p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Live Pricing
              </span>
            </div>

            <div className="space-y-3.5">
              {STORE_SERVICES.map((srv) => (
                <div
                  key={srv.id}
                  className="rounded-2xl border border-zinc-200/90 bg-white p-5 hover:border-zinc-300 transition-all shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-zinc-900">{srv.title}</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
                          {srv.badge}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">{srv.tagline}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-base font-black text-zinc-950">{srv.price}</p>
                      <p className="text-[10.5px] font-bold text-emerald-700 mt-0.5">⏱ {srv.turnaround}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-100">
                    {srv.details.map((dt, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-zinc-600 font-medium">
                        <span className="size-1.5 rounded-full bg-emerald-600 shrink-0" />
                        <span>{dt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Store QR Standee & Smart Deep Link Card (1 Col Sticky) */}
          <div className="space-y-5 lg:sticky lg:top-28">
            <div className="rounded-3xl border-2 border-dashed border-zinc-300 bg-white p-6 shadow-sm text-center space-y-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 text-zinc-800 text-[11px] font-mono font-bold uppercase tracking-wider">
                  Store Standee QR Code
                </span>
                <h3 className="text-base font-black text-zinc-950">Scan with Phone to Order</h3>
                <p className="text-xs text-zinc-500">
                  Open your mobile camera or scanner to launch this store directly in the QuickPress Customer App.
                </p>
              </div>

              {/* Dynamic QR Standee Image */}
              <div className="mx-auto flex size-52 items-center justify-center rounded-2xl bg-white p-3 shadow-md border border-zinc-200">
                <img
                  src={qrCodeUrl}
                  alt={`QuickPress QR Standee - ${partnerId}`}
                  className="size-full rounded-xl object-contain"
                />
              </div>

              <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-2.5 text-left space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Direct Store Link</span>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    {copiedLink ? "✓ Copied!" : "Copy Link"}
                  </button>
                </div>
                <div className="text-[11px] font-mono text-zinc-700 truncate select-all bg-white px-2.5 py-1.5 rounded-lg border border-zinc-200">
                  {canonicalStoreUrl}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleShare}
                  className="py-2.5 px-3 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-900 transition-all cursor-pointer shadow-2xs"
                >
                  Share Store
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Order laundry & garment care from QuickPress Store Hub (${partnerId}):\n${canonicalStoreUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
                >
                  <span>WhatsApp</span>
                </a>
              </div>

              {/* Direct Booking CTA */}
              <button
                type="button"
                onClick={() => onOpenModal("booking")}
                className="w-full py-3.5 px-5 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-black text-sm tracking-wide transition-all shadow-md cursor-pointer block text-center"
              >
                Schedule Doorstep Pickup
              </button>
            </div>

            {/* Helpline Card */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-xs space-y-1.5">
              <p className="font-bold text-zinc-900">Need Assistance with this Store?</p>
              <p className="text-zinc-500">
                Our central merchant dispatch desk is available 24x7 for pickups and garment inquiries.
              </p>
              <p className="font-bold text-zinc-950 pt-1">
                Toll-Free: <a href="tel:18008897842" className="text-emerald-700 hover:underline">1800-889-QUICK</a> ·{" "}
                <a href="mailto:official.quickpress@gmail.com" className="text-emerald-700 hover:underline">official.quickpress@gmail.com</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
