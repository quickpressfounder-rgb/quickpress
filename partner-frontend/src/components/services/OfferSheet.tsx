import { Tag } from "lucide-react";
import { useState } from "react";

import { ChoiceChip, FormField } from "../PartnerFormPrimitives";
import {
  OFFER_TYPES,
  type ManagedService,
  type OfferType,
  type ServiceOffer,
} from "../../data/partner-services-mock";
import { ServiceSheet } from "./ServiceDetailsSheet";

/** Create-offer sheet (UI only — no pricing engine wired). */
export function OfferSheet({
  services,
  presetServiceId,
  onClose,
  onCreate,
}: {
  services: ManagedService[];
  presetServiceId?: string;
  onClose: () => void;
  onCreate: (offer: Omit<ServiceOffer, "id">) => void;
}) {
  const [serviceId, setServiceId] = useState(presetServiceId ?? services[0]?.id ?? "");
  const [type, setType] = useState<OfferType>("flat");
  const [value, setValue] = useState("");
  const [title, setTitle] = useState("");
  const [validTill, setValidTill] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isFlat = type === "flat";

  const submit = () => {
    const amount = Number(value);
    if (!serviceId) return setError("Pick a service for this offer");
    if (!Number.isFinite(amount) || amount <= 0) return setError("Enter a discount value");
    if (!isFlat && amount > 90) return setError("Percentage discount must be 90% or less");
    if (title.trim().length < 3) return setError("Give the offer a short name");
    setError(null);
    onCreate({
      serviceId,
      type,
      value: amount,
      title: title.trim(),
      validTill: validTill.trim() || "No end date",
    });
  };

  return (
    <ServiceSheet title="Create Offer" icon={<Tag className="size-4" />} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-widest text-muted-foreground">
            Offer Type
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {OFFER_TYPES.map((option) => (
              <ChoiceChip
                key={option.id}
                label={option.label}
                selected={type === option.id}
                onClick={() => setType(option.id)}
              />
            ))}
          </div>
          <p className="mt-1.5 text-[0.68rem] font-medium text-muted-foreground">
            {OFFER_TYPES.find((option) => option.id === type)?.hint}
          </p>
        </div>

        <label className="block">
          <span className="text-[0.68rem] font-bold uppercase tracking-widest text-muted-foreground">
            Applies To
          </span>
          <div className="field-focus mt-2 flex items-center rounded-2xl border border-border bg-card px-4 py-3 shadow-soft">
            <select
              value={serviceId}
              onChange={(event) => setServiceId(event.target.value)}
              className="min-w-0 flex-1 appearance-none bg-transparent text-sm font-semibold tracking-tight text-foreground outline-none"
            >
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>
        </label>

        <FormField
          id="offer-value"
          label={isFlat ? "Discount Amount" : "Discount Percentage"}
          prefix={isFlat ? "₹" : "%"}
          type="number"
          min="1"
          max={isFlat ? undefined : 90}
          step="1"
          inputMode="numeric"
          placeholder={isFlat ? "50" : "15"}
          value={value}
          onChange={(event) => setValue(event.target.value.replace(/[^\d]/g, ""))}
        />

        <FormField
          id="offer-title"
          label="Offer Name"
          icon={Tag}
          placeholder="e.g. Festival Sparkle Sale"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />

        <FormField
          id="offer-valid"
          label="Valid Till"
          placeholder="e.g. 30 Sep"
          hint="Limited-time and festival offers show this window to customers."
          value={validTill}
          onChange={(event) => setValidTill(event.target.value)}
        />

        <p className="text-[0.68rem] font-medium text-muted-foreground">
          Offers are not saved to your store yet — they stay on this device for this
          session only.
        </p>

        {error ? (
          <p className="animate-soft-fade text-[0.7rem] font-semibold text-destructive">{error}</p>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="ripple rounded-2xl border border-border bg-card px-4 py-3 text-xs font-bold tracking-tight text-foreground transition-all duration-300 active:scale-[0.97]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="ripple rounded-2xl bg-primary px-4 py-3 text-xs font-black tracking-tight text-primary-foreground transition-all duration-300 active:scale-[0.97]"
          >
            Create Offer
          </button>
        </div>
      </div>
    </ServiceSheet>
  );
}
