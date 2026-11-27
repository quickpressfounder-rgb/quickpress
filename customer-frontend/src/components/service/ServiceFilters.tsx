import { Check, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";

import {
  DEFAULT_LISTING_FILTERS,
  DISTANCE_OPTIONS,
  PICKUP_OPTIONS,
  PRICE_OPTIONS,
  QUICK_FILTERS,
  RATING_OPTIONS,
  SORT_OPTIONS,
  activeFilterCount,
  type ListingFilters,
} from "@/api/customer/service-listing-api";

type Props = {
  filters: ListingFilters;
  onChange: (next: ListingFilters) => void;
  resultCount: number;
};

/** Sticky quick-filter row plus a sort & refine sheet. Selections persist. */
export function ServiceFilters({ filters, onChange, resultCount }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const active = activeFilterCount(filters);

  const toggle = (key: (typeof QUICK_FILTERS)[number]["id"]) =>
    onChange({ ...filters, [key]: !filters[key] });

  return (
    <>
      <div className="sticky top-[3.75rem] z-20 -mx-5 bg-background/92 px-5 py-3 backdrop-blur-xl">
        <div className="scrollbar-none flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className={`ripple flex h-9 shrink-0 items-center gap-1.5 rounded-2xl border px-3 text-[11px] font-bold transition-all duration-300 active:scale-[0.96] ${
              active > 0
                ? "border-primary bg-primary text-primary-foreground shadow-cta"
                : "border-border bg-card text-foreground"
            }`}
          >
            <SlidersHorizontal className="size-3.5" />
            Sort & filter
            {active > 0 ? (
              <span className="rounded-full bg-background/25 px-1.5 text-[10px]">{active}</span>
            ) : null}
          </button>

          {QUICK_FILTERS.map((filter) => {
            const on = filters[filter.id];
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => toggle(filter.id)}
                className={`ripple h-9 shrink-0 rounded-2xl border px-3 text-[11px] font-bold transition-all duration-300 active:scale-[0.96] ${
                  on
                    ? "border-primary bg-primary/15 text-brand-dark"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {resultCount} {resultCount === 1 ? "partner" : "partners"} available
        </p>
      </div>

      {sheetOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-dark/45 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0"
          />
          <div className="animate-sheet-up relative w-full max-w-md rounded-t-4xl border border-border bg-card p-5 pb-8">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">Sort & filter</p>
              <button
                type="button"
                aria-label="Close filters"
                onClick={() => setSheetOpen(false)}
                className="ripple flex size-9 items-center justify-center rounded-2xl border border-border text-foreground active:scale-[0.94]"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="mt-5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Sort by
            </p>
            <div className="mt-2.5 space-y-1.5">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onChange({ ...filters, sort: option.id })}
                  className={`ripple flex w-full items-center justify-between rounded-2xl border px-3.5 py-2.5 text-xs font-bold transition-all duration-300 active:scale-[0.98] ${
                    filters.sort === option.id
                      ? "border-primary bg-primary/12 text-brand-dark"
                      : "border-border text-foreground"
                  }`}
                >
                  {option.label}
                  {filters.sort === option.id ? <Check className="size-4" /> : null}
                </button>
              ))}
            </div>

            <p className="mt-5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Minimum rating
            </p>
            <div className="mt-2.5 flex gap-2">
              {RATING_OPTIONS.map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => onChange({ ...filters, minRating: rating })}
                  className={`ripple h-9 flex-1 rounded-2xl border text-[11px] font-bold transition-all duration-300 active:scale-[0.96] ${
                    filters.minRating === rating
                      ? "border-primary bg-primary/12 text-brand-dark"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {rating === 0 ? "Any" : `${rating}+`}
                </button>
              ))}
            </div>

            <p className="mt-5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Distance
            </p>
            <div className="mt-2.5 flex gap-2">
              {DISTANCE_OPTIONS.map((distance) => (
                <button
                  key={distance}
                  type="button"
                  onClick={() => onChange({ ...filters, maxDistance: distance })}
                  className={`ripple h-9 flex-1 rounded-2xl border text-[11px] font-bold transition-all duration-300 active:scale-[0.96] ${
                    filters.maxDistance === distance
                      ? "border-primary bg-primary/12 text-brand-dark"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {distance === 0 ? "Any" : `${distance} km`}
                </button>
              ))}
            </div>

            <p className="mt-5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Starting price
            </p>
            <div className="mt-2.5 flex gap-2">
              {PRICE_OPTIONS.map((price) => (
                <button
                  key={price}
                  type="button"
                  onClick={() => onChange({ ...filters, maxPrice: price })}
                  className={`ripple h-9 flex-1 rounded-2xl border text-[11px] font-bold transition-all duration-300 active:scale-[0.96] ${
                    filters.maxPrice === price
                      ? "border-primary bg-primary/12 text-brand-dark"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {price === 0 ? "Any" : `₹${price}`}
                </button>
              ))}
            </div>

            <p className="mt-5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Pickup time
            </p>
            <div className="mt-2.5 flex gap-2">
              {PICKUP_OPTIONS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => onChange({ ...filters, maxPickupMinutes: minutes })}
                  className={`ripple h-9 flex-1 rounded-2xl border text-[11px] font-bold transition-all duration-300 active:scale-[0.96] ${
                    filters.maxPickupMinutes === minutes
                      ? "border-primary bg-primary/12 text-brand-dark"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {minutes === 0 ? "Any" : `${minutes} min`}
                </button>
              ))}
            </div>

            <div className="mt-6 flex gap-2.5">
              <button
                type="button"
                onClick={() => onChange({ ...DEFAULT_LISTING_FILTERS })}
                className="ripple h-12 flex-1 rounded-3xl border border-border text-sm font-bold text-foreground transition-all duration-300 active:scale-[0.97]"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="ripple h-12 flex-1 rounded-3xl bg-primary text-sm font-bold text-primary-foreground shadow-cta transition-all duration-300 hover:brightness-[1.03] active:scale-[0.97]"
              >
                Show {resultCount} results
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
