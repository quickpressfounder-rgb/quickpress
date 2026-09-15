import React, { useEffect, useState } from "react";
import {
  Check,
  Compass,
  Home,
  MapPin,
  Navigation,
  Plus,
  RotateCcw,
  Route,
  Sparkles,
  Train,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { triggerHaptic } from "../../lib/captain-audio";
import {
  fetchRouteBookingState,
  setRouteDestination,
  toggleRouteBooking,
  type RouteBookingState,
  type RouteDestination,
} from "../../api/rider/rider-route-booking-api";

interface CaptainRouteBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStateChange?: (state: RouteBookingState) => void;
  onUpdated?: (state: RouteBookingState) => void;
}

const PRESET_LOCATIONS: RouteDestination[] = [
  {
    id: "loc-home",
    name: "Home",
    type: "home",
    address: "Soron Gate, Near Chamunda Mandir, Kasganj",
    lat: 27.815,
    lng: 78.649,
  },
  {
    id: "loc-hub",
    name: "QuickPress Hub",
    type: "hub",
    address: "Soron Gate Commercial Complex, Kasganj",
    lat: 27.8118,
    lng: 78.6477,
  },
  {
    id: "loc-railway",
    name: "Railway Junction",
    type: "station",
    address: "Station Road, Railway Colony, Kasganj",
    lat: 27.8035,
    lng: 78.642,
  },
  {
    id: "loc-bilram",
    name: "Bilram Gate",
    type: "market",
    address: "Bilram Gate Main Bazar, Kasganj",
    lat: 27.808,
    lng: 78.653,
  },
];

export const CaptainRouteBookingModal: React.FC<CaptainRouteBookingModalProps> = ({
  isOpen,
  onClose,
  onStateChange,
  onUpdated,
}) => {
  const [state, setState] = useState<RouteBookingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedDest, setSelectedDest] = useState<RouteDestination | null>(null);
  const [detourKm, setDetourKm] = useState<number>(2.0);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customAddress, setCustomAddress] = useState("");

  const notifyChange = (st: RouteBookingState) => {
    if (onStateChange) onStateChange(st);
    if (onUpdated) onUpdated(st);
  };

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetchRouteBookingState();
      setState(res);
      setSelectedDest(res.destination);
      setDetourKm(res.maxDetourKm || 2.0);
      notifyChange(res);
    } catch {
      toast.error("Could not load route booking details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void load();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = async () => {
    if (!state) return;
    triggerHaptic();
    setActionLoading(true);
    try {
      const nextActive = !state.isActive;
      const res = await toggleRouteBooking(nextActive);
      if (!res.ok) {
        toast.error(res.error || "Failed to toggle Route Booking.");
        return;
      }
      setState(res.state);
      notifyChange(res.state);
      toast.success(
        nextActive
          ? "Route Booking Active! 🚀 Only on-route orders will be dispatched."
          : "Route Booking Paused. Normal citywide orders resumed."
      );
    } catch {
      toast.error("Network error updating Route Booking.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectPreset = async (dest: RouteDestination) => {
    triggerHaptic(40);
    setSelectedDest(dest);
    setIsCustomMode(false);
    setActionLoading(true);
    try {
      const res = await setRouteDestination({
        name: dest.name,
        address: dest.address,
        lat: dest.lat,
        lng: dest.lng,
        maxDetourKm: detourKm,
        type: dest.type,
      });
      if (res.ok) {
        setState(res.state);
        notifyChange(res.state);
        toast.success(`Destination set to ${dest.name} 📍`);
      }
    } catch {
      toast.error("Failed to update route destination.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveCustom = async () => {
    if (!customName.trim() || !customAddress.trim()) {
      toast.error("Please enter a name and address for your custom route.");
      return;
    }
    triggerHaptic();
    setActionLoading(true);
    try {
      // Default Kasganj coordinates fallback for custom address
      const res = await setRouteDestination({
        name: customName.trim(),
        address: customAddress.trim(),
        lat: 27.812,
        lng: 78.648,
        maxDetourKm: detourKm,
        type: "custom",
      });
      if (res.ok) {
        setState(res.state);
        setSelectedDest(res.destination);
        setIsCustomMode(false);
        notifyChange(res.state);
        toast.success(`Custom destination saved: ${customName} 📍`);
      }
    } catch {
      toast.error("Failed to save custom destination.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetDetour = async (km: number) => {
    triggerHaptic(30);
    setDetourKm(km);
    if (!selectedDest) return;
    try {
      const res = await setRouteDestination({
        name: selectedDest.name,
        address: selectedDest.address,
        lat: selectedDest.lat,
        lng: selectedDest.lng,
        maxDetourKm: km,
        type: selectedDest.type,
      });
      if (res.ok) {
        setState(res.state);
        notifyChange(res.state);
      }
    } catch {
      /* quiet */
    }
  };

  const isActive = Boolean(state?.isActive);
  const passesRem = state?.passesRemaining ?? 3;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92dvh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-9 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/80 shadow-2xs">
              <Route className="size-5 stroke-[2.3]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black text-zinc-950 tracking-tight">
                  My Route Booking
                </h3>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 animate-pulse"
                      : "bg-zinc-100 text-zinc-600 border-zinc-200"
                  }`}
                >
                  {isActive ? "ACTIVE 🟢" : "INACTIVE"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-medium">
                Deliveries only on your way towards destination
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Modal"
            className="flex items-center justify-center size-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 active:scale-90 transition-all cursor-pointer"
          >
            <X className="size-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Daily Passes Banner */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 shadow-2xs">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-blue-600 shrink-0" />
              <div>
                <p className="text-xs font-black text-blue-950">Daily Route Passes</p>
                <p className="text-[10px] text-blue-700 font-medium">
                  Resets every day at 12:00 AM midnight
                </p>
              </div>
            </div>
            <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-blue-600 text-white shadow-xs">
              {passesRem} Left
            </span>
          </div>

          {/* Current Destination Display */}
          <div className="p-3.5 rounded-2xl border border-zinc-200/90 bg-zinc-50/70 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                Current Route Destination
              </span>
              {isActive && (
                <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-600">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live Filtering
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center size-8 rounded-xl bg-white text-zinc-700 border border-zinc-200 shrink-0 shadow-2xs">
                <MapPin className="size-4 text-rose-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-zinc-950 truncate">
                  {selectedDest?.name || "Soron Gate (Home)"}
                </p>
                <p className="text-[11px] text-zinc-500 truncate">
                  {selectedDest?.address || "Kasganj, Uttar Pradesh"}
                </p>
              </div>
            </div>
          </div>

          {/* Preset Destination Buttons */}
          <div className="space-y-2">
            <p className="text-[11px] font-extrabold text-zinc-700 uppercase tracking-wider">
              Select or Change Destination
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_LOCATIONS.map((preset) => {
                const isSelected = selectedDest?.name === preset.name;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleSelectPreset(preset)}
                    className={`flex items-start gap-2 p-2.5 rounded-2xl border text-left transition-all active:scale-98 cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 border-blue-400 text-blue-950 shadow-2xs ring-1 ring-blue-400/30"
                        : "bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {preset.type === "home" ? (
                        <Home className="size-4 text-emerald-600" />
                      ) : preset.type === "station" ? (
                        <Train className="size-4 text-amber-600" />
                      ) : (
                        <MapPin className="size-4 text-blue-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black truncate">{preset.name}</p>
                      <p className="text-[10px] text-zinc-500 truncate leading-tight mt-0.5">
                        {preset.address.split(",")[0]}
                      </p>
                    </div>
                    {isSelected && <Check className="size-3.5 text-blue-600 shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>

            {/* Custom Destination Toggle */}
            {!isCustomMode ? (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(30);
                  setIsCustomMode(true);
                }}
                className="flex w-full items-center justify-center gap-1.5 py-2 text-xs font-bold text-blue-600 hover:text-blue-700 active:scale-98 transition-colors cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span>Set Other Custom Location</span>
              </button>
            ) : (
              <div className="p-3 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-2 mt-2">
                <p className="text-[11px] font-extrabold text-blue-950">Custom Destination</p>
                <input
                  type="text"
                  placeholder="Location Name (e.g., Mom's Place, Shop)"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Full Address / Landmark in Kasganj"
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveCustom}
                    className="flex-1 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
                  >
                    Save & Set Route
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCustomMode(false)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-200 text-zinc-700 font-bold text-xs hover:bg-zinc-300 active:scale-95 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Corridor Detour Tolerance */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-zinc-700 uppercase tracking-wider">
                Max Corridor Detour
              </span>
              <span className="text-xs font-black text-blue-600">
                ±{detourKm.toFixed(1)} km allowed
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { km: 1.0, label: "1.0 km", desc: "Strict Path" },
                { km: 2.0, label: "2.0 km", desc: "Recommended" },
                { km: 3.5, label: "3.5 km", desc: "Wide Corridor" },
              ].map((opt) => (
                <button
                  key={opt.km}
                  type="button"
                  onClick={() => handleSetDetour(opt.km)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all active:scale-95 cursor-pointer ${
                    detourKm === opt.km
                      ? "bg-zinc-950 text-white border-zinc-950 shadow-xs"
                      : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  <span className="text-xs font-black">{opt.label}</span>
                  <span
                    className={`text-[9px] ${
                      detourKm === opt.km ? "text-zinc-300" : "text-zinc-400"
                    }`}
                  >
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-zinc-100 bg-zinc-50/80 shrink-0">
          <button
            type="button"
            disabled={actionLoading || (!isActive && passesRem <= 0)}
            onClick={handleToggle}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm tracking-wide shadow-lg transition-all active:scale-98 cursor-pointer ${
              isActive
                ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25"
            } ${actionLoading ? "opacity-75 cursor-not-allowed" : ""}`}
          >
            <Zap className="size-4 fill-current stroke-none" />
            <span>
              {actionLoading
                ? "Updating Route..."
                : isActive
                ? "Deactivate Route Booking"
                : `Activate Route Booking (${passesRem} Passes Left)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
