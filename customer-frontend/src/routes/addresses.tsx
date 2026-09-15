import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Briefcase,
  Check,
  Crosshair,
  Home,
  Loader2,
  Map as MapIcon,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  Star,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AddressesSkeleton } from "@/components/account/AccountSkeletons";
import { BottomNav } from "@/components/home/BottomNav";
import { MapPicker, type PickedLocation } from "@/components/MapPicker";
import { ScreenTopBar } from "@/components/rewards/ScreenTopBar";
import { Toaster } from "@/shared/ui/sonner";
import {
  checkPincodeServiceability,
  type PincodeServiceabilityResult,
} from "@/api/core/maps-api";
import {
  createAddress,
  deleteAddress,
  detectCurrentLocation,
  EMPTY_ADDRESS,
  fetchAddresses,
  formatAddress,
  setDefaultAddress,
  updateAddress,
  validateAddress,
  readCachedAddresses,
  type AddressDraft,
  type AddressType,
  type SavedAddress,
} from "@/api/customer/addresses-api";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export const Route = createFileRoute("/addresses")({
  head: () => ({
    meta: [
      { title: "Saved Addresses — QuickPress Pickup & Delivery" },
      {
        name: "description",
        content:
          "Manage your QuickPress pickup and delivery addresses — add home, office or other locations, set a default and use your current location in one tap.",
      },
      { property: "og:title", content: "Saved Addresses — QuickPress" },
      {
        property: "og:description",
        content:
          "Add, edit and set default laundry pickup addresses for faster QuickPress orders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AddressesScreen,
});

const TYPE_META: Record<AddressType, { icon: typeof Home; tone: string; label: string }> = {
  home: { icon: Home, tone: "bg-primary/15 text-brand-dark", label: "Home" },
  office: { icon: Briefcase, tone: "bg-secondary/10 text-brand-green", label: "Office" },
  other: { icon: MapPin, tone: "bg-muted text-muted-foreground", label: "Other" },
};

/** Text fields only — coordinates are set through GPS or the map picker. */
type AddressTextField = Exclude<keyof AddressDraft, "type" | "latitude" | "longitude">;

const FIELDS: { key: AddressTextField; label: string; placeholder: string; half?: boolean }[] = [
  { key: "houseNumber", label: "House Number", placeholder: "B-402", half: true },
  { key: "building", label: "Building Name", placeholder: "Sunrise Residency", half: true },
  { key: "street", label: "Street", placeholder: "Palm Grove Road" },
  { key: "area", label: "Area", placeholder: "Indiranagar" },
  { key: "landmark", label: "Landmark", placeholder: "Opposite metro pillar" },
  { key: "city", label: "City", placeholder: "Bengaluru", half: true },
  { key: "state", label: "State", placeholder: "Karnataka", half: true },
  { key: "pincode", label: "PIN Code", placeholder: "560038", half: true },
  { key: "contactName", label: "Contact Name", placeholder: "Aarav Sharma", half: true },
  { key: "phone", label: "Phone Number", placeholder: "+91 98765 43210" },
];

function AddressesScreen() {
  useAuthGuard();
  const [addresses, setAddresses] = useState<SavedAddress[] | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressDraft>(EMPTY_ADDRESS);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [checkingPincode, setCheckingPincode] = useState(false);
  const [pincodeStatus, setPincodeStatus] = useState<PincodeServiceabilityResult | null>(null);

  // Real-time Pincode Serviceability & Geofencing Territory check
  useEffect(() => {
    let alive = true;
    const pin = (form.pincode || "").trim();
    if (pin.length === 6 && /^\d{6}$/.test(pin)) {
      setCheckingPincode(true);
      checkPincodeServiceability(pin, form.city)
        .then((res) => {
          if (alive) {
            setPincodeStatus(res);
            if (res.city) {
              setForm((prev) => ({
                ...prev,
                city: res.city,
                state: res.state || prev.state,
              }));
            }
          }
        })
        .catch(() => {
          if (alive) setPincodeStatus(null);
        })
        .finally(() => {
          if (alive) setCheckingPincode(false);
        });
    } else {
      setPincodeStatus(null);
    }
    return () => {
      alive = false;
    };
  }, [form.pincode]);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setAddresses(await fetchAddresses());
    } catch {
      // Offline or the API is down: fall back to the last saved copy.
      const cached = readCachedAddresses();
      if (cached) {
        setAddresses(cached);
        toast("Showing your saved addresses offline");
      } else {
        setLoadError("We couldn't load your addresses.");
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const retry = async () => {
    setRetrying(true);
    await load();
    setRetrying(false);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_ADDRESS);
    setSheetOpen(true);
  };

  const openEdit = (address: SavedAddress) => {
    const { id: _id, isDefault: _isDefault, ...draft } = address;
    setEditingId(address.id);
    setForm(draft);
    setSheetOpen(true);
  };

  const handleSave = async () => {
    const validation = validateAddress(form) as Record<string, string>;
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const updated = await updateAddress(editingId, form);
        setAddresses((prev) =>
          prev
            ? prev.map((item) => (item.id === editingId ? { ...item, ...form, ...updated } : item))
            : prev,
        );
        toast.success("Address updated");
      } else {
        const created = await createAddress(form);
        setAddresses((prev) => (prev ? [...prev, created] : [created]));
        toast.success("Address added");
      }
      setSheetOpen(false);
      setErrors({});
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Couldn't save this address. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      await deleteAddress(id);
      // The backend promotes a survivor to default, so re-read the list.
      await load();
      toast.success("Address removed");
    } catch {
      toast.error("Couldn't remove this address");
    } finally {
      setBusyId(null);
    }
  };

  const handleDefault = async (id: string) => {
    setBusyId(id);
    const previous = addresses;
    setAddresses((prev) =>
      prev ? prev.map((item) => ({ ...item, isDefault: item.id === id })) : prev,
    );
    try {
      await setDefaultAddress(id);
      await load();
      toast.success("Default address updated");
    } catch {
      setAddresses(previous);
      toast.error("Couldn't set the default address");
    } finally {
      setBusyId(null);
    }
  };

  const handleCurrentLocation = async () => {
    setLocating(true);
    try {
      // Real device GPS + reverse geocoding
      const detected = await detectCurrentLocation();
      setEditingId(null);
      setForm({ ...EMPTY_ADDRESS, ...detected });
      setMapOpen(true);
      toast.success("Location detected");
    } catch (cause) {
      setEditingId(null);
      setMapOpen(true);
      if (cause instanceof Error && cause.message) {
        toast.info(cause.message);
      }
    } finally {
      setLocating(false);
    }
  };

  /** Map picker → address form (coordinates + reverse geocoded fields). */
  const applyPickedLocation = (picked: PickedLocation) => {
    setForm((prev) => ({
      ...prev,
      street: prev.street || (picked.formattedAddress.split(",")[0]?.trim() ?? ""),
      area: picked.area || prev.area,
      city: picked.city || prev.city,
      state: picked.state || prev.state,
      pincode: picked.pincode || prev.pincode,
      latitude: picked.latitude,
      longitude: picked.longitude,
    }));
    setMapOpen(false);
    setSheetOpen(true);
    toast.success("Location pinned on map");
  };

  const setType = (type: AddressType) =>
    setForm((prev) => ({
      ...prev,
      type,
      label: prev.label && prev.type !== type ? TYPE_META[type].label : TYPE_META[type].label,
    }));

  const canSave = Boolean(form.area.trim() && form.city.trim() && form.pincode.trim());

  return (
    <main className="relative min-h-screen overflow-x-hidden scroll-smooth bg-white dark:bg-zinc-950">
      <div className="relative mx-auto w-full max-w-md">
        <ScreenTopBar
          title="Saved Addresses"
          action={
            <button
              type="button"
              aria-label="Add address"
              onClick={openAdd}
              className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-cta transition-all duration-300 active:scale-[0.94]"
            >
              <Plus className="size-5" />
            </button>
          }
        />

        {!addresses ? (
          <AddressesSkeleton />
        ) : (
          <div className="px-5 pb-32 pt-4">
            {/* Quick actions */}
            <section className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => void handleCurrentLocation()}
                disabled={locating}
                className="card-soft ripple flex items-center gap-3 border border-border p-4 text-left transition-all duration-300 hover:border-primary/60 active:scale-[0.96] disabled:opacity-70"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-brand-green">
                  {locating ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Crosshair className="size-5" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.8rem] font-bold leading-tight text-foreground">
                    Use Current Location
                  </span>
                  <span className="block text-[11px] text-muted-foreground">GPS detect</span>
                </span>
              </button>

              <button
                type="button"
                onClick={openAdd} className="card-soft ripple flex items-center gap-3 border border-border p-4 text-left transition-all duration-300 hover:border-primary/60 active:scale-[0.96]"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-brand-dark">
                  <Plus className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.8rem] font-bold leading-tight text-foreground">
                    Add New Address
                  </span>
                  <span className="block text-[11px] text-muted-foreground">Manual entry</span>
                </span>
              </button>
            </section>

            {/* Address list — GET /api/addresses */}
            <section className="mt-7">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black tracking-tight text-foreground">
                  Your Addresses
                </h2>
                <span className="text-[0.68rem] font-semibold text-muted-foreground">
                  {addresses.length} saved
                </span>
              </div>

              <div className="stagger-children mt-4 space-y-3">
                {addresses.map((address, index) => {
                  const meta = TYPE_META[address.type];
                  const Icon = meta.icon;
                  return (
                    <article
                      key={address.id} className="card-soft border border-border p-4 transition-all duration-300 hover:border-primary/60"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${meta.tone}`}
                        >
                          <Icon className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-bold tracking-tight text-foreground">
                              {address.label}
                            </h3>
                            {address.isDefault ? (
                              <span className="animate-pop rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-green">
                                Default
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {formatAddress(address)}
                          </p>
                          <p className="mt-2 text-[11px] font-semibold text-foreground">
                            {address.contactName} · {address.phone}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(address)}
                          className="ripple flex h-9 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-muted text-[0.72rem] font-bold text-foreground transition-all duration-300 hover:bg-accent active:scale-[0.96]"
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={busyId === address.id || address.isDefault}
                          onClick={() => void handleDefault(address.id)}
                          className="ripple flex h-9 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-primary/15 text-[0.72rem] font-bold text-brand-dark transition-all duration-300 active:scale-[0.96] disabled:opacity-45"
                        >
                          {busyId === address.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Star className="size-3.5" />
                          )}
                          Default
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${address.label}`}
                          disabled={busyId === address.id}
                          onClick={() => void handleDelete(address.id)}
                          className="ripple flex size-9 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive transition-all duration-300 active:scale-[0.94] disabled:opacity-45"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </article>
                  );
                })}

                {addresses.length === 0 ? (
                  <div className="card-soft border border-border p-8 text-center">
                    <span className="mx-auto flex size-14 items-center justify-center rounded-3xl bg-muted text-muted-foreground">
                      <MapPin className="size-6" />
                    </span>
                    <p className="mt-3 text-sm font-bold text-foreground">No addresses yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Add a pickup address to place your first order.
                    </p>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Add / edit address sheet — POST /api/addresses, PUT /api/addresses/{id} */}
      {sheetOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setSheetOpen(false)}
            className="animate-overlay-in absolute inset-0 bg-brand-dark/50 backdrop-blur-sm"
          />
          <div className="animate-sheet-up relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-4xl bg-card px-5 pb-10 pt-4 shadow-soft">
            <div className="mx-auto h-1.5 w-10 rounded-full bg-border" />
            <div className="mt-4 flex items-center justify-between">
              <h2 className="text-base font-bold tracking-tight text-foreground">
                {editingId ? "Edit Address" : "Add Address"}
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSheetOpen(false)}
                className="flex size-9 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-colors hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="stagger-children mt-4 grid grid-cols-2 gap-3">
              {FIELDS.map((field) => (
                <label
                  key={field.key}
                  className={`block ${field.half ? "col-span-1" : "col-span-2"}`}
                >
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {field.label}
                  </span>
                  <input
                    value={form[field.key]}
                    placeholder={field.placeholder}
                    onChange={(event) => {
                      setForm((prev) => ({ ...prev, [field.key]: event.target.value }));
                      if (errors[field.key]) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next[field.key];
                          return next;
                        });
                      }
                    }}
                    className={`mt-1.5 h-12 w-full rounded-2xl border ${
                      errors[field.key] ? "border-destructive ring-1 ring-destructive" : "border-border"
                    } bg-background px-4 text-sm font-semibold text-foreground outline-none transition-colors placeholder:font-medium placeholder:text-muted-foreground/70 focus:border-primary`}
                  />
                  {errors[field.key] ? (
                    <span className="mt-1 block text-[11px] font-semibold text-destructive">
                      {errors[field.key]}
                    </span>
                  ) : null}
                </label>
              ))}
            </div>

            {/* Real-time Pincode Geofencing Serviceability Banner */}
            {form.pincode && form.pincode.length === 6 ? (
              <div className="mt-3.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 space-y-1.5 transition-all">
                {checkingPincode ? (
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                    <Loader2 className="size-3.5 animate-spin text-emerald-600" />
                    <span>Verifying express serviceability for PIN {form.pincode}...</span>
                  </div>
                ) : pincodeStatus?.serviceable ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-black text-emerald-950">
                        <Zap className="size-3.5 text-emerald-600" />
                        Instant Fast Delivery Available
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-300">
                        PIN {form.pincode}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-emerald-800 leading-snug">
                      {pincodeStatus.activePartnersCount} partner store(s) and {pincodeStatus.activeRidersCount} active captain(s) stationed in {pincodeStatus.city} ({pincodeStatus.state}) for express 30-min pickup.
                    </p>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <AlertCircle className="size-4 text-amber-600 shrink-0" />
                    <span>Standard delivery available in PIN {form.pincode}. Express dispatch coming soon.</span>
                  </div>
                )}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setSheetOpen(false);
                setMapOpen(true);
              }}
              className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-border bg-background p-3.5 text-left transition-colors hover:border-primary/60"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-brand-green">
                <MapIcon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[0.8rem] font-bold leading-tight text-foreground">
                  {form.latitude != null && form.longitude != null
                    ? "Location pinned on map"
                    : "Pin exact location on map"}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {form.latitude != null && form.longitude != null
                    ? `${form.latitude.toFixed(5)}, ${form.longitude.toFixed(5)}`
                    : "Helps the rider reach your door"}
                </span>
              </span>
            </button>

            <div className="mt-4">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Address Type
              </span>
              <div className="stagger-children mt-2 grid grid-cols-3 gap-2">
                {(Object.keys(TYPE_META) as AddressType[]).map((type) => {
                  const meta = TYPE_META[type];
                  const Icon = meta.icon;
                  const active = form.type === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setType(type)}
                      className={`flex h-12 items-center justify-center gap-1.5 rounded-2xl border text-[0.75rem] font-bold transition-all duration-300 active:scale-[0.96] ${
                        active
                          ? "border-primary bg-primary/15 text-brand-dark"
                          : "border-border bg-background text-muted-foreground"
                      }`}
                    >
                      <Icon className="size-4" />
                      {meta.label}
                      {active ? <Check className="size-3.5" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="sticky bottom-0 -mx-5 -mb-10 mt-6 bg-card/95 px-5 pb-8 pt-3 backdrop-blur-md">
              <button
                type="button"
                disabled={saving || !canSave}
                onClick={() => void handleSave()}
                className="ripple flex h-13 w-full items-center justify-center gap-2 rounded-3xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-cta transition-all duration-300 active:scale-[0.97] disabled:opacity-50"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Save Address
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {mapOpen ? (
        <MapPicker
          initial={
            form.latitude != null && form.longitude != null
              ? { latitude: form.latitude, longitude: form.longitude }
              : undefined
          }
          onConfirm={applyPickedLocation}
          onClose={() => {
            setMapOpen(false);
            setSheetOpen(true);
          }}
        />
      ) : null}

      {mapOpen || sheetOpen ? null : <BottomNav active="addresses" />}
      <Toaster />
    </main>
  );
}
