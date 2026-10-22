import React, { useState } from "react";
import {
  PlusCircle,
  QrCode,
  Printer,
  Volume2,
  CloudRain,
  Flame,
  Search,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { playUrgentSlaBuzzer } from "../../lib/partner-order-alert-sound";
import { WalkInOrderModal } from "./WalkInOrderModal";
import { ScanBagTagModal } from "./ScanBagTagModal";
import type { ManagedOrder } from "../../data/partner-orders-mock";

interface QuickMerchantToolsBarProps {
  orders: ManagedOrder[];
  onOrderCreated?: (newOrder: ManagedOrder) => void;
  onSelectOrder?: (orderId: string) => void;
}

export function QuickMerchantToolsBar({
  orders,
  onOrderCreated,
  onSelectOrder,
}: QuickMerchantToolsBarProps) {
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [rainModeActive, setRainModeActive] = useState(() => {
    return localStorage.getItem("qp_partner_rain_mode") === "true";
  });

  const toggleRainMode = () => {
    const next = !rainModeActive;
    setRainModeActive(next);
    localStorage.setItem("qp_partner_rain_mode", String(next));
    if (next) {
      toast.warning("🌧️ Rain / Bad Weather Mode Activated", {
        description: "Delivery captains & dispatch engine notified of wet weather delays.",
      });
    } else {
      toast.success("☀️ Normal Weather Mode Restored", {
        description: "Standard delivery SLA and dispatch timelines resumed.",
      });
    }
  };

  const handleTestSound = () => {
    playUrgentSlaBuzzer();
    toast.info("🔔 High-Priority Order Buzzer Sounding", {
      description: "Audio engine calibrated at max volume for laundry floor noise.",
    });
  };

  return (
    <>
      <div className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Section Heading */}
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/60 shadow-2xs">
              <Sparkles className="size-4.5" />
            </span>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Store Operations & Quick Tools
              </h3>
              <p className="text-[11px] font-medium text-slate-500">
                Counter POS • Thermal Tag Printing • QR Bag Scanner • Emergency Controls
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* New Walk-in / Counter Order Button */}
            <button
              type="button"
              onClick={() => setShowWalkInModal(true)}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-blue-600 px-3.5 py-2 text-xs font-black text-white shadow-xs transition-all hover:bg-blue-700 active:scale-95 cursor-pointer"
            >
              <PlusCircle className="size-4" />
              <span>+ Counter Walk-In</span>
            </button>

            {/* Scan Bag QR Button */}
            <button
              type="button"
              onClick={() => setShowScanModal(true)}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-2xs transition-all hover:bg-slate-50 active:scale-95 cursor-pointer"
            >
              <QrCode className="size-4 text-blue-600" />
              <span>Scan Bag Tag</span>
            </button>

            {/* Weather / Rain Mode Toggle */}
            <button
              type="button"
              onClick={toggleRainMode}
              className={`inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer ${
                rainModeActive
                  ? "border-amber-300 bg-amber-50 text-amber-800 font-black"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <CloudRain className={`size-4 ${rainModeActive ? "text-amber-600 animate-bounce" : "text-slate-400"}`} />
              <span>{rainModeActive ? "🌧️ Rain Mode ON" : "Rain Mode"}</span>
            </button>

            {/* Speaker Buzzer Test */}
            <button
              type="button"
              onClick={handleTestSound}
              title="Test Order Alarm Sound"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-600 shadow-2xs transition-all hover:bg-slate-50 active:scale-95 cursor-pointer"
            >
              <Volume2 className="size-4 text-blue-600" />
              <span className="hidden sm:inline">Test Bell</span>
            </button>
          </div>
        </div>
      </div>

      {/* Counter POS Walk-In Modal */}
      {showWalkInModal && (
        <WalkInOrderModal
          onClose={() => setShowWalkInModal(false)}
          onOrderCreated={(order) => {
            setShowWalkInModal(false);
            if (onOrderCreated) onOrderCreated(order);
          }}
        />
      )}

      {/* Bag Tag QR Scanner Modal */}
      {showScanModal && (
        <ScanBagTagModal
          orders={orders}
          onClose={() => setShowScanModal(false)}
          onSelectOrder={(orderId) => {
            setShowScanModal(false);
            if (onSelectOrder) onSelectOrder(orderId);
          }}
        />
      )}
    </>
  );
}
