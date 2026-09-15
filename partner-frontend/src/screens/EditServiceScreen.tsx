import { useNavigate } from "@tanstack/react-router";
import { Save, Tag } from "lucide-react";
import { useState } from "react";

import { Toaster } from "@/shared/ui/sonner";

import { toast } from "sonner";

import { PartnerTopBar } from "../components/PartnerTopBar";
import { ServiceEmptyState } from "../components/services/ServiceEmptyState";
import { ServiceFormSkeleton } from "../components/services/ServiceSkeletons";
import {
  ServiceForm,
  validateServiceForm,
  type ServiceFormErrors,
  type ServiceFormValues,
} from "../components/services/ServiceForm";
import { ServiceSuccessOverlay } from "../components/services/ServiceSuccessOverlay";
import { OfferSheet } from "../components/services/OfferSheet";
import { usePartnerServices } from "../context/PartnerServicesContext";
import { partnerRoutes } from "../navigation/partner-routes";

export function EditServiceScreen({ serviceId }: { serviceId: string }) {
  const navigate = useNavigate();
  const { services, isLoading, getService, updateService, addOffer } = usePartnerServices();
  const service = getService(serviceId);

  const [values, setValues] = useState<ServiceFormValues | null>(null);
  const [errors, setErrors] = useState<ServiceFormErrors>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [offerSheetOpen, setOfferSheetOpen] = useState(false);

  const form: ServiceFormValues | null =
    values ??
    (service
      ? {
          name: service.name,
          category: service.category,
          description: service.description,
          price: String(service.price),
          unit: service.unit,
          estimatedHours: String(service.estimatedHours),
          minOrderValue: String(service.minOrderValue),
          imageLabel: service.imageLabel ?? "",
          enabled: service.enabled,
        }
      : null);

  const change = <K extends keyof ServiceFormValues>(key: K, value: ServiceFormValues[K]) => {
    if (!form) return;
    setValues({ ...form, [key]: value });
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const [isSaving, setIsSaving] = useState(false);

  const submit = async () => {
    if (!form || !service) return;
    const nextErrors = validateServiceForm(form, "edit");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      await updateService(service.id, {
        description: form.description.trim(),
        price: Number(form.price),
        estimatedHours: Number(form.estimatedHours),
        minOrderValue: Number(form.minOrderValue),
        enabled: form.enabled,
        imageLabel: form.imageLabel || null,
      });
      setSuccess("✓ Service update submitted for Admin approval! Admin verification ke baad live hogi.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update service");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[26rem] -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />

      <div className="relative mx-auto w-full max-w-md md:max-w-2xl">
        <PartnerTopBar
          title={service ? `Edit ${service.name}` : "Edit Service"}
          subtitle="Update pricing, timing & availability"
          onBack={() => navigate({ to: partnerRoutes.services })}
        />

        {isLoading && !service ? (
          <ServiceFormSkeleton />
        ) : !service || !form ? (
          <div className="px-5 pb-32 pt-6">
            <ServiceEmptyState
              variant="no-results"
              onAction={() => navigate({ to: partnerRoutes.services })}
            />
          </div>
        ) : (
          <>
            <div className="animate-slide-up px-5 pb-36 pt-4">
              {(service.pendingApproval || service.approvalStatus === "pending") && (
                <div className="mb-4 rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-900 font-medium">
                  ⏳ <strong>Admin Review Pending:</strong> This service has changes currently under review. Further edits will update your pending request.
                </div>
              )}
              {service.approvalStatus === "rejected" && (
                <div className="mb-4 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-900 font-medium">
                  ❌ <strong>Admin Rejected:</strong> {service.rejectionReason || "Verification failed. Please update the details and resubmit."}
                </div>
              )}

              <ServiceForm mode="edit" values={form} errors={errors} onChange={change} />

              <button
                type="button"
                onClick={() => setOfferSheetOpen(true)}
                className="ripple mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-xs font-bold tracking-tight text-foreground transition-all duration-300 hover:border-primary/60 active:scale-[0.98]"
              >
                <Tag className="size-3.5" />
                Add an offer for this service
              </button>
            </div>

            <div className="glass-panel fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md px-5 pb-5 pt-3 md:max-w-2xl">
              <button
                type="button"
                onClick={() => void submit()}
                disabled={isSaving}
                className="ripple flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-black tracking-tight text-primary-foreground transition-all duration-300 active:scale-[0.98] disabled:opacity-60"
              >
                <Save className="size-4" />
                {isSaving ? "Submitting..." : "Submit Changes for Admin Approval"}
              </button>
            </div>
          </>
        )}
      </div>

      {offerSheetOpen && service ? (
        <OfferSheet
          services={services}
          presetServiceId={service.id}
          onClose={() => setOfferSheetOpen(false)}
          onCreate={(offer) => {
            addOffer(offer);
            setOfferSheetOpen(false);
            setSuccess("Offer created for this session");
          }}
        />
      ) : null}

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
