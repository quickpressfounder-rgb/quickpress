import { BadgeCheck, Clock, MapPin, Star, Tag, Truck } from "lucide-react";
import { memo } from "react";

import type { ListingPartner } from "@/api/customer/service-listing-api";
import store1 from "@/shared/assets/store-1.jpg";

type Props = {
  partner: ListingPartner;
  onOpen: (id: string) => void;
};

/**
 * Partner card used across the service listing without banner image.
 * Uses clean store logo avatar, operational tags and pricing summary.
 */
export const PartnerCard = memo(function PartnerCard({ partner, onOpen }: Props) {
  const logoSrc =
    partner.logo && (partner.logo.startsWith("http") || partner.logo.startsWith("data:") || partner.logo.startsWith("/"))
      ? partner.logo
      : partner.image && (partner.image.startsWith("http") || partner.image.startsWith("data:") || partner.image.startsWith("/"))
        ? partner.image
        : store1;

  return (
    <button
      type="button"
      onClick={() => onOpen(partner.id)}
      className="contain-render card-soft ripple animate-pop w-full overflow-hidden border border-border/80 bg-card p-4 text-left transition-all duration-300 hover:border-primary hover:shadow-soft active:scale-[0.985]"
    >
      <div className="flex items-start gap-3.5">
        {/* Store Logo / Avatar */}
        <div className="relative shrink-0">
          <div className="flex size-16 items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-muted/40 shadow-2xs">
            <img
              src={logoSrc}
              alt={`${partner.name} logo`}
              width={128}
              height={128}
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          </div>
          <span
            className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-black ${
              partner.open
                ? "bg-secondary text-secondary-foreground"
                : "bg-zinc-800 text-zinc-100"
            }`}
          >
            {partner.open ? "Open" : "Closed"}
          </span>
        </div>

        {/* Store Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="flex items-center gap-1.5 truncate text-sm font-black tracking-tight text-foreground">
                {partner.name}
                {partner.verified ? (
                  <BadgeCheck className="size-3.5 shrink-0 text-brand-green" />
                ) : null}
              </h3>
              <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
                {partner.services.slice(0, 3).join(" · ") || "Laundry & Dry Clean"}
              </p>
            </div>

            <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-brand-dark">
              <Star className="size-3 fill-current" />
              {partner.rating}
              <span className="font-medium text-muted-foreground text-[10px]">({partner.reviews})</span>
            </span>
          </div>

          {/* Operational Metrics */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-muted-foreground">
            <span className="flex items-center gap-1">
              <Truck className="size-3 text-primary" /> Pickup {partner.pickupTime}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3 text-secondary" /> Delivery {partner.deliveryTime}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="size-3 text-muted-foreground" /> {partner.distanceKm} km
            </span>
          </div>
        </div>
      </div>

      {/* Footer Details & Offer */}
      <div className="mt-3.5 flex items-center justify-between border-t border-dashed border-border/80 pt-2.5 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-medium">
            Starts <span className="font-black text-foreground">₹{partner.minPrice}</span>
          </span>
          <span className="text-muted-foreground/60">·</span>
          <span className="text-muted-foreground font-medium">
            <span className="font-black text-foreground">{partner.servicesCount}</span> services
          </span>
        </div>

        {partner.offerLabel ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 border border-emerald-200/60">
            <Tag className="size-2.5" /> {partner.offerLabel}
          </span>
        ) : (
          <span className="text-[10px] font-bold text-muted-foreground">
            Min order ₹{partner.minOrderValue}
          </span>
        )}
      </div>
    </button>
  );
});
