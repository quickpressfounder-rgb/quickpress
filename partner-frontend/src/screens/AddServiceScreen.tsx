import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";

import { Toaster } from "@/shared/ui/sonner";

import { toast } from "sonner";

import { PartnerTopBar } from "../components/PartnerTopBar";
import {
  ServiceForm,
  emptyServiceForm,
  validateServiceForm,
  type ServiceFormErrors,
  type ServiceFormValues,
} from "../components/services/ServiceForm";
import { ServiceSuccessOverlay } from "../components/services/ServiceSuccessOverlay";
import { usePartnerServices } from "../context/PartnerServicesContext";
import { partnerRoutes } from "../navigation/partner-routes";

export function AddServiceScreen() {
  const navigate = useNavigate();
  const { addService } = usePartnerServices();

  const [values, setValues] = useState<ServiceFormValues>(emptyServiceForm);
  const [errors, setErrors] = useState<ServiceFormErrors>({});
  const [success, setSuccess] = useState<string | null>(null);

  const change = <K extends keyof ServiceFormValues>(key: K, value: ServiceFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const [isSaving, setIsSaving] = useState(false);

  const submit = async () => {
    const nextErrors = validateServiceForm(values, "create");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      await addService({
        name: values.name.trim(),
        category: values.category,
        icon: "premium",
        description: values.description.trim(),
        price: Number(values.price),
        unit: values.unit,
        estimatedHours: Number(values.estimatedHours),
        minOrderValue: Number(values.minOrderValue),
        enabled: values.enabled,
        imageLabel: values.imageLabel || null,
      });
      setSuccess("✓ Service submitted for Admin approval! Admin verification ke baad live hogi.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add service");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[26rem] -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />

      <div className="relative mx-auto w-full max-w-md md:max-w-2xl">
        <PartnerTopBar
          title="Add Service"
          subtitle="Submit a new service for Admin approval"
          onBack={() => navigate({ to: partnerRoutes.services })}
        />

        <div className="animate-slide-up px-5 pb-36 pt-4">
          <div className="mb-4 rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-900">
            ⏳ <strong>Admin Approval Required:</strong> New services are verified by QuickPress Admin before going live in customer catalog.
          </div>
          <ServiceForm mode="create" values={values} errors={errors} onChange={change} />
        </div>

        <div className="glass-panel fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md px-5 pb-5 pt-3 md:max-w-2xl">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={isSaving}
            className="ripple flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-black tracking-tight text-primary-foreground transition-all duration-300 active:scale-[0.98] disabled:opacity-60"
          >
            <Plus className="size-4" />
            {isSaving ? "Submitting..." : "Submit for Admin Approval"}
          </button>
        </div>
      </div>

      <ServiceSuccessOverlay
        message={success}
        onDone={() => {
          setSuccess(null);
          void navigate({ to: partnerRoutes.services });
        }}
      />
      <Toaster />
    </main>
  );
}
