import React, { useEffect, useState } from "react";
import {
  X,
  Navigation,
  ExternalLink,
  PackageCheck,
  MapPin,
  ShoppingBag,
  RotateCw,
  Bike,
  CheckCircle2,
  Clock,
  ChevronRight,
} from "lucide-react";
import { fetchRouteBatch, type RouteBatchSummary } from "@/api/rider/rider-orders-api";
import { toast } from "sonner";

interface SmartRouteBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCoords?: { lat: number; lng: number } | null;
}

export function SmartRouteBatchModal({
  isOpen,
  onClose,
  currentCoords,
}: SmartRouteBatchModalProps) {
  const [activeTab, setActiveTab] = useState<"stops" | "inventory">("stops");
  const [isLoading, setIsLoading] = useState(false);
  const [batchData, setBatchData] = useState<RouteBatchSummary | null>(null);

  const loadBatch = async () => {
    setIsLoading(true);
    try {
      const data = await fetchRouteBatch(currentCoords?.lat, currentCoords?.lng);
      setBatchData(data);
    } catch {
      toast.error("Could not load route batch. Using local active orders.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadBatch();
    }
  }, [isOpen, currentCoords?.lat, currentCoords?.lng]);

  if (!isOpen) return null;

  const stops = batchData?.stops || [];
  const inventory = batchData?.inventoryBags || [];
  const totalBags = inventory.length;
  const totalPieces = batchData?.totalPiecesCarried || 0;

  const handleOpenNavigation = (lat: number, lng: number, address: string) => {
    if (lat && lng) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=two_wheeler`,
        "_blank"
      );
    } else {
      const q = encodeURIComponent(address || "Kasganj");
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=two_wheeler`,
        "_blank"
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-zinc-900 border border-zinc-200">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-xs">
              <Bike className="size-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-zinc-900">
                Route Batch & Bike Inventory
              </h2>
              <p className="text-[11px] text-zinc-500">
                Sequenced Multi-Order Stops & Cargo Manifest
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={loadBatch}
              disabled={isLoading}
              className="p-2 text-zinc-400 hover:text-zinc-700 rounded-lg transition-colors cursor-pointer"
              title="Refresh Route"
            >
              <RotateCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-700 rounded-lg transition-colors cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-5 pt-3 pb-2 bg-zinc-50 border-b border-zinc-200/80">
          <button
            type="button"
            onClick={() => setActiveTab("stops")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "stops"
                ? "bg-white text-zinc-950 shadow-xs border border-zinc-200"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Sequenced Stops ({stops.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("inventory")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "inventory"
                ? "bg-white text-zinc-950 shadow-xs border border-zinc-200"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Bike Manifest ({totalBags} bags • {totalPieces} pcs)
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {activeTab === "stops" ? (
            stops.length === 0 ? (
              <div className="py-12 text-center text-zinc-500">
                <ShoppingBag className="size-10 mx-auto text-zinc-300 mb-2 stroke-[1.5]" />
                <p className="text-sm font-semibold text-zinc-700">No Multi-Stop Batch Active</p>
                <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                  When you accept multiple pickups or deliveries, the route sequencer will order them here for minimal travel time.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {stops.map((stop, idx) => {
                  const isPickup = stop.type.includes("pickup");
                  return (
                    <div
                      key={`${stop.orderId}-${stop.sequence}`}
                      className={`relative p-3.5 rounded-2xl border transition-all ${
                        stop.isNextStop
                          ? "bg-emerald-50/60 border-emerald-300 shadow-xs"
                          : "bg-white border-zinc-200/90 hover:border-zinc-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Sequence Number */}
                          <div
                            className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                              stop.isNextStop
                                ? "bg-emerald-600 text-white ring-2 ring-emerald-200"
                                : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                            }`}
                          >
                            {stop.sequence}
                          </div>

                          {/* Stop Info */}
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${
                                  isPickup
                                    ? "bg-amber-100 text-amber-900 border border-amber-200"
                                    : "bg-blue-100 text-blue-900 border border-blue-200"
                                }`}
                              >
                                {stop.title}
                              </span>
                              {stop.isNextStop && (
                                <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                                  Next Stop
                                </span>
                              )}
                            </div>

                            <p className="text-xs font-bold text-zinc-900 truncate">
                              {stop.targetName || `Order #${stop.orderId.slice(-6)}`}
                            </p>
                            <p className="text-[11px] text-zinc-500 line-clamp-2">
                              {stop.address}
                            </p>

                            <div className="flex items-center gap-2 pt-1 text-[11px] text-zinc-600">
                              {stop.bagTag && (
                                <span className="font-mono font-bold bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800 border border-zinc-200">
                                  🏷️ {stop.bagTag}
                                </span>
                              )}
                              <span>• {stop.piecesCount} pcs</span>
                              {stop.distanceKm > 0 && (
                                <span>• ~{stop.distanceKm} km</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Navigation action button */}
                        <button
                          type="button"
                          onClick={() => handleOpenNavigation(stop.lat, stop.lng, stop.address)}
                          className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold active:scale-95 transition-all shadow-2xs"
                        >
                          <Navigation className="size-3.5" />
                          <span>Nav</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Inventory Manifest Tab */
            inventory.length === 0 ? (
              <div className="py-12 text-center text-zinc-500">
                <PackageCheck className="size-10 mx-auto text-zinc-300 mb-2 stroke-[1.5]" />
                <p className="text-sm font-semibold text-zinc-700">Cargo Carrier Empty</p>
                <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                  No laundry bags are currently logged on your bike. Tagged bags will be cataloged here automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-2xl flex items-center justify-between text-xs font-bold text-zinc-800">
                  <span>Carrying on Bike:</span>
                  <span className="font-mono bg-white px-2.5 py-1 rounded-lg border border-zinc-200 text-zinc-950">
                    {inventory.length} Sealed Bags • {totalPieces} Garments
                  </span>
                </div>

                {inventory.map((bag, idx) => (
                  <div
                    key={`${bag.orderId}-${idx}`}
                    className="p-3.5 bg-white border border-zinc-200 rounded-2xl space-y-2 hover:border-zinc-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs bg-zinc-900 text-white px-2 py-0.5 rounded-md">
                          {bag.bagTag || `QP-BAG-${bag.orderId.slice(-4)}`}
                        </span>
                        <span className="text-xs font-bold text-zinc-700">
                          {bag.piecesCount} Pieces
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="size-3" /> Sealed
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-600 space-y-0.5">
                      <p className="font-medium text-zinc-800">
                        Customer: <span className="font-bold">{bag.customerName || "Customer"}</span>
                      </p>
                      <p className="truncate">
                        Destination: {bag.deliveryAddress}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Modal Bottom Close */}
        <div className="p-4 border-t border-zinc-100 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs rounded-xl active:scale-98 transition-all cursor-pointer"
          >
            Close Route Batch
          </button>
        </div>
      </div>
    </div>
  );
}
