import { AlignLeft, Clock3, ImageIcon, IndianRupee, Layers, Tag, Wallet } from "lucide-react";

import {
  ChoiceChip,
  FormField,
  SectionCard,
  TextAreaField,
  UploadTile,
} from "../PartnerFormPrimitives";
import { ToggleRow } from "../PartnerPrimitives";
import {
  SERVICE_CATEGORIES,
  SERVICE_UNITS,
  type ServiceCategoryId,
  type ServiceUnit,
} from "../../data/partner-services-mock";

export type ServiceFormValues = {
  name: string;
  category: ServiceCategoryId;
  description: string;
  price: string;
  unit: ServiceUnit;
  estimatedHours: string;
  minOrderValue: string;
  imageLabel: string;
  enabled: boolean;
};

export type ServiceFormErrors = Partial<Record<keyof ServiceFormValues, string>>;

export function emptyServiceForm(): ServiceFormValues {
  return {
    name: "",
    category: "wash",
    description: "",
    price: "",
    unit: "kg",
    estimatedHours: "24",
    minOrderValue: "199",
    imageLabel: "",
    enabled: true,
  };
}

export function validateServiceForm(values: ServiceFormValues, mode: "create" | "edit") {
  const errors: ServiceFormErrors = {};
  if (mode === "create" && values.name.trim().length < 3) {
    errors.name = "Enter a service name (min 3 characters)";
  }
  if (values.description.trim().length < 10) {
    errors.description = "Add a short description customers will understand";
  }
  const price = Number(values.price);
  if (!Number.isFinite(price) || price <= 0) {
    errors.price = "Enter a base price above ₹0";
  }
  const hours = Number(values.estimatedHours);
  if (!Number.isFinite(hours) || hours <= 0) {
    errors.estimatedHours = "Estimated time must be at least 1 hour";
  }
  const minOrder = Number(values.minOrderValue);
  if (!Number.isFinite(minOrder) || minOrder < 0) {
    errors.minOrderValue = "Enter a valid minimum order value";
  }
  return errors;
}

/**
 * Shared Add / Edit service form. `mode="edit"` locks identity fields
 * (name, category, unit) and only exposes pricing, description, time,
 * availability and the image placeholder.
 */
export function ServiceForm({
  mode,
  values,
  errors,
  onChange,
}: {
  mode: "create" | "edit";
  values: ServiceFormValues;
  errors: ServiceFormErrors;
  onChange: <K extends keyof ServiceFormValues>(key: K, value: ServiceFormValues[K]) => void;
}) {
  const isCreate = mode === "create";

  return (
    <div className="space-y-4">
      {isCreate ? (
        <SectionCard title="Service basics">
          <FormField
            id="service-name"
            label="Service Name"
            icon={Tag}
            placeholder="e.g. Wash & Fold"
            value={values.name}
            error={errors.name}
            onChange={(event) => onChange("name", event.target.value)}
          />

          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-widest text-muted-foreground">
              Category
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SERVICE_CATEGORIES.map((category) => (
                <ChoiceChip
                  key={category.id}
                  label={category.label}
                  icon={Layers}
                  selected={values.category === category.id}
                  onClick={() => onChange("category", category.id)}
                />
              ))}
            </div>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Description">
        <TextAreaField
          id="service-description"
          label="Short Description"
          value={values.description}
          error={errors.description}
          placeholder="What's included, fabric care notes, packaging…"
          onChange={(next) => onChange("description", next)}
        />
      </SectionCard>

      <SectionCard title="Pricing">
        <FormField
          id="service-price"
          label="Base Price"
          prefix="₹"
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          placeholder="79"
          value={values.price}
          error={errors.price}
          onChange={(event) => onChange("price", event.target.value.replace(/[^\d]/g, ""))}
        />

        {isCreate ? (
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-widest text-muted-foreground">
              Pricing Unit
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SERVICE_UNITS.map((unit) => (
                <ChoiceChip
                  key={unit.id}
                  label={unit.label}
                  selected={values.unit === unit.id}
                  onClick={() => onChange("unit", unit.id)}
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="rounded-2xl bg-muted px-4 py-3 text-[0.7rem] font-semibold text-muted-foreground">
            Pricing unit locked to{" "}
            <span className="text-foreground">
              {SERVICE_UNITS.find((unit) => unit.id === values.unit)?.label}
            </span>{" "}
            for live services.
          </p>
        )}

        <FormField
          id="service-min-order"
          label="Minimum Order Value"
          prefix="₹"
          inputMode="numeric"
          placeholder="199"
          value={values.minOrderValue}
          error={errors.minOrderValue}
          onChange={(event) => onChange("minOrderValue", event.target.value.replace(/[^\d]/g, ""))}
        />
      </SectionCard>

      <SectionCard title="Turnaround">
        <FormField
          id="service-time"
          label="Estimated Time (hours)"
          icon={Clock3}
          inputMode="numeric"
          placeholder="24"
          hint="Shown to customers as the delivery promise."
          value={values.estimatedHours}
          error={errors.estimatedHours}
          onChange={(event) => onChange("estimatedHours", event.target.value.replace(/[^\d]/g, ""))}
        />
      </SectionCard>

      <SectionCard title="Service image">
        <UploadTile
          label="Service Image"
          hint="Placeholder only — upload wires up later"
          icon={ImageIcon}
          aspect="wide"
          value={values.imageLabel}
          onPick={(name) => onChange("imageLabel", name)}
          onClear={() => onChange("imageLabel", "")}
        />
      </SectionCard>

      <SectionCard title="Availability">
        <ToggleRow
          icon={Layers}
          label="Available for orders"
          description={values.enabled ? "Live on the customer app" : "Hidden from customers"}
          checked={values.enabled}
          onChange={(next) => onChange("enabled", next)}
        />
      </SectionCard>
    </div>
  );
}
