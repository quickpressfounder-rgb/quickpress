import { Bike, Compass, MapPin, Navigation, ShieldCheck, Truck } from "lucide-react";

import type { ServiceArea } from "../../data/partner-shop-mock";

/** Modern service area & coverage summary. */
export function ShopServiceArea({ area }: { area: ServiceArea }) {
  const items = [
    {
      icon: MapPin,
      label: "Registered Hub City",
      value: area.city || "Kasganj",
      desc: "Primary delivery hub and center",
      color: "bg-blue-50 text-blue-600",
    },
    {
      icon: Navigation,
      label: "Outlet Location / Area",
      value: area.area || "Main Market",
      desc: "Store physical address sector",
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      icon: Bike,
      label: "Customer Pickup Radius",
      value: `${area.pickupRadiusKm || 8}.0 km`,
      desc: "Max distance for automated rider pickup",
      color: "bg-purple-50 text-purple-600",
    },
    {
      icon: Truck,
      label: "Delivery SLA Radius",
      value: `${area.deliveryRadiusKm || 8}.0 km`,
      desc: "Guaranteed 24h doorstep dropoff zone",
      color: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-2.5 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-start gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-3.5 transition-all hover:bg-white hover:shadow-2xs"
          >
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${item.color} shadow-2xs`}>
              <item.icon className="size-5 stroke-[2.2]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                {item.label}
              </p>
              <p className="text-sm font-black tracking-tight text-zinc-900 truncate">
                {item.value}
              </p>
              <p className="text-[11px] font-medium text-zinc-500 truncate">
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200/70 px-3.5 py-2.5 text-xs font-bold text-emerald-800">
        <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
        <span>Rider auto-dispatch is active within {area.pickupRadiusKm || 8}.0 km coverage area.</span>
      </div>
    </div>
  );
}

