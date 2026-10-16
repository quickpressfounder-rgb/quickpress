import {
  Bike,
  Check,
  Compass,
  MapPin,
  Minus,
  Navigation,
  Plus,
  ShieldCheck,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ShopSheet } from "./ShopSheet";

export interface ShopCoverageModalProps {
  open: boolean;
  onClose: () => void;
  pickupRadiusKm: number;
  deliveryRadiusKm: number;
  servicePincodes?: string[];
  sectors?: string[];
  city?: string;
  onSave: (patch: {
    pickupRadiusKm: number;
    deliveryRadiusKm: number;
    servicePincodes: string[];
    sectors: string[];
  }) => Promise<void> | void;
}

const RADIUS_PRESETS = [3, 5, 8, 12, 15, 20];

export function ShopCoverageModal({
  open,
  onClose,
  pickupRadiusKm: initialPickupRadius,
  deliveryRadiusKm: initialDeliveryRadius,
  servicePincodes: initialPincodes = [],
  sectors: initialSectors = [],
  city = "Kasganj",
  onSave,
}: ShopCoverageModalProps) {
  const [pickupRadius, setPickupRadius] = useState<number>(initialPickupRadius || 8);
  const [deliveryRadius, setDeliveryRadius] = useState<number>(initialDeliveryRadius || 10);
  const [pincodes, setPincodes] = useState<string[]>(
    Array.isArray(initialPincodes) ? initialPincodes.filter(Boolean) : []
  );
  const [sectors, setSectors] = useState<string[]>(
    Array.isArray(initialSectors) ? initialSectors.filter(Boolean) : []
  );

  const [newPincode, setNewPincode] = useState("");
  const [newSector, setNewSector] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleAddPincode = () => {
    const clean = newPincode.trim();
    if (!/^\d{6}$/.test(clean)) {
      toast.error("Please enter a valid 6-digit Indian PIN code (e.g. 207001)");
      return;
    }
    if (pincodes.includes(clean)) {
      toast.warning(`Pincode ${clean} is already in your service area`);
      return;
    }
    setPincodes([...pincodes, clean]);
    setNewPincode("");
    toast.success(`Added PIN code ${clean}`);
  };

  const handleRemovePincode = (code: string) => {
    setPincodes(pincodes.filter((p) => p !== code));
  };

  const handleAddSector = () => {
    const clean = newSector.trim();
    if (!clean) return;
    if (sectors.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      toast.warning(`Sector "${clean}" is already added`);
      return;
    }
    setSectors([...sectors, clean]);
    setNewSector("");
    toast.success(`Added locality "${clean}"`);
  };

  const handleRemoveSector = (sec: string) => {
    setSectors(sectors.filter((s) => s !== sec));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        pickupRadiusKm: Number(pickupRadius),
        deliveryRadiusKm: Number(deliveryRadius),
        servicePincodes: pincodes,
        sectors: sectors,
      });
      toast.success("Service coverage & pincodes updated successfully!");
      onClose();
    } catch {
      toast.error("Failed to update coverage settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ShopSheet
      open={open}
      onClose={onClose}
      title="Coverage Radius & Service Pincodes"
      subtitle={`Configure store dispatch boundary and delivery locations for ${city}`}
      footer={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 rounded-2xl border border-zinc-200 py-3 text-xs font-bold text-zinc-700 hover:bg-zinc-50 active:scale-95 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-xs font-black text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all"
          >
            {isSaving ? "Saving..." : "Save Coverage Area"}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Section 1: Pickup Radius */}
        <div className="space-y-3 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Bike className="size-4" strokeWidth={2.4} />
              </span>
              <div>
                <p className="text-xs font-black text-zinc-900">Customer Pickup Radius</p>
                <p className="text-[10px] text-zinc-500">Max distance for captain pickup dispatch</p>
              </div>
            </div>
            <span className="rounded-xl border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-black text-purple-700">
              {pickupRadius} km
            </span>
          </div>

          {/* Stepper & Slider */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setPickupRadius(Math.max(1, pickupRadius - 1))}
              className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 active:scale-90 transition-all"
            >
              <Minus className="size-3.5" />
            </button>
            <input
              type="range"
              min={1}
              max={25}
              value={pickupRadius}
              onChange={(e) => setPickupRadius(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-purple-600"
            />
            <button
              type="button"
              onClick={() => setPickupRadius(Math.min(25, pickupRadius + 1))}
              className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 active:scale-90 transition-all"
            >
              <Plus className="size-3.5" />
            </button>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-bold text-zinc-400 mr-1">Quick:</span>
            {RADIUS_PRESETS.map((km) => (
              <button
                key={km}
                type="button"
                onClick={() => setPickupRadius(km)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                  pickupRadius === km
                    ? "bg-purple-600 text-white shadow-2xs"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {km} km
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Delivery SLA Radius */}
        <div className="space-y-3 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Truck className="size-4" strokeWidth={2.4} />
              </span>
              <div>
                <p className="text-xs font-black text-zinc-900">Delivery SLA Radius</p>
                <p className="text-[10px] text-zinc-500">Guaranteed doorstep dropoff boundary</p>
              </div>
            </div>
            <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
              {deliveryRadius} km
            </span>
          </div>

          {/* Stepper & Slider */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setDeliveryRadius(Math.max(1, deliveryRadius - 1))}
              className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 active:scale-90 transition-all"
            >
              <Minus className="size-3.5" />
            </button>
            <input
              type="range"
              min={1}
              max={25}
              value={deliveryRadius}
              onChange={(e) => setDeliveryRadius(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-amber-600"
            />
            <button
              type="button"
              onClick={() => setDeliveryRadius(Math.min(25, deliveryRadius + 1))}
              className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 active:scale-90 transition-all"
            >
              <Plus className="size-3.5" />
            </button>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-bold text-zinc-400 mr-1">Quick:</span>
            {RADIUS_PRESETS.map((km) => (
              <button
                key={km}
                type="button"
                onClick={() => setDeliveryRadius(km)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                  deliveryRadius === km
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {km} km
              </button>
            ))}
          </div>
        </div>

        {/* Section 3: Serviceable Pincodes */}
        <div className="space-y-3 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <MapPin className="size-4" strokeWidth={2.4} />
              </span>
              <div>
                <p className="text-xs font-black text-zinc-900">Serviceable PIN Codes</p>
                <p className="text-[10px] text-zinc-500">
                  {pincodes.length === 0
                    ? "Store visible to all nearby customers"
                    : `${pincodes.length} PIN codes assigned`}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-black text-blue-700">
              {pincodes.length} PINs
            </span>
          </div>

          {/* Input field + Add button */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              maxLength={6}
              placeholder="Enter 6-digit PIN (e.g. 207001)"
              value={newPincode}
              onChange={(e) => setNewPincode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddPincode();
                }
              }}
              className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-900 placeholder:text-zinc-400 focus:border-blue-600 focus:bg-white outline-none transition-all"
            />
            <button
              type="button"
              onClick={handleAddPincode}
              className="flex items-center gap-1 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>Add</span>
            </button>
          </div>

          {/* Pincode Tag Chips */}
          {pincodes.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {pincodes.map((code) => (
                <span
                  key={code}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-2.5 py-1 text-xs font-black text-blue-900 shadow-2xs"
                >
                  <span>{code}</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePincode(code)}
                    aria-label={`Remove pincode ${code}`}
                    className="size-4 rounded-full hover:bg-blue-200/80 flex items-center justify-center text-blue-600 transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-zinc-400 italic">
              No specific PIN codes added. QuickPress will automatically show your store to customers within your {pickupRadius} km radius.
            </p>
          )}
        </div>

        {/* Section 4: Serviceable Sectors & Localities */}
        <div className="space-y-3 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Navigation className="size-4" strokeWidth={2.4} />
              </span>
              <div>
                <p className="text-xs font-black text-zinc-900">Service Localities & Sectors</p>
                <p className="text-[10px] text-zinc-500">Key covered landmarks or colonies</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-700">
              {sectors.length} Areas
            </span>
          </div>

          {/* Input field + Add button */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="e.g. Civil Lines, Main Market, Sector 14"
              value={newSector}
              onChange={(e) => setNewSector(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSector();
                }
              }}
              className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:bg-white outline-none transition-all"
            />
            <button
              type="button"
              onClick={handleAddSector}
              className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>Add</span>
            </button>
          </div>

          {/* Sector Tag Chips */}
          {sectors.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {sectors.map((sec) => (
                <span
                  key={sec}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-2.5 py-1 text-xs font-black text-emerald-900 shadow-2xs"
                >
                  <span>{sec}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSector(sec)}
                    aria-label={`Remove sector ${sec}`}
                    className="size-4 rounded-full hover:bg-emerald-200/80 flex items-center justify-center text-emerald-600 transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-zinc-400 italic">
              Add your primary neighborhood sectors so customers recognize your local presence.
            </p>
          )}
        </div>

        {/* Live Protection Info Card */}
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs text-emerald-900">
          <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
          <p className="font-medium text-[11px] leading-snug">
            Updating your radius and PIN codes automatically updates customer marketplace visibility and purges the catalog cache immediately.
          </p>
        </div>
      </div>
    </ShopSheet>
  );
}
