import { Bike, Compass, MapPin, Navigation, Pencil, ShieldCheck, Truck } from "lucide-react";

import type { ServiceArea } from "../../data/partner-shop-mock";

/** Modern service area & coverage summary with PIN codes and edit trigger. */
export function ShopServiceArea({
  area,
  onEdit,
}: {
  area: ServiceArea;
  onEdit?: () => void;
}) {
  const items = [
    {
      icon: MapPin,
      label: "Registered Hub City",
      value: area.city || "Operating City",
      desc: "Primary delivery hub and center",
      color: "bg-blue-50 text-blue-600",
    },
    {
      icon: Navigation,
      label: "Outlet Location / Area",
      value: area.area || "Store Outlet",
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

      {/* PIN Codes & Sectors Pill Bar */}
      {area.servicePincodes && area.servicePincodes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/50">
          <span className="text-[11px] font-black text-zinc-400 uppercase tracking-wider mr-1">
            Service PINs:
          </span>
          {area.servicePincodes.map((pin) => (
            <span
              key={pin}
              className="rounded-lg border border-blue-200 bg-white px-2 py-0.5 text-xs font-black text-blue-900 shadow-2xs"
            >
              {pin}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 rounded-2xl bg-emerald-50 border border-emerald-200/70 p-3 text-xs font-bold text-emerald-800">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
          <span className="truncate">Rider auto-dispatch is active within {area.pickupRadiusKm || 8}.0 km coverage area.</span>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="shrink-0 flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-2xs cursor-pointer"
          >
            <Pencil className="size-3" />
            <span>Edit Coverage</span>
          </button>
        )}
      </div>
    </div>
  );
}

