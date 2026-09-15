import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bike,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileText,
  Gauge,
  Mail,
  Power,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Timer,
  Trash2,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Toaster } from "@/shared/ui/sonner";
import { PartnerLayout } from "../components/layout/PartnerLayout";
import { PartnerListSkeleton } from "../components/PartnerSkeletons";
import { usePartnerResource } from "../hooks/use-partner-resource";
import { partnerRoutes } from "../navigation/partner-routes";
import { fetchBusinessSettings, updateBusinessSettings } from "@/api/partner/partner-profile-api";
import type { BusinessSettings } from "@/shared/types/partner";

/**
 * High-contrast iOS toggle switch component
 */
function SwitchToggle({
  checked,
  onChange,
  disabled = false,
  onDisabledClick,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  onDisabledClick?: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (disabled) {
          onDisabledClick?.();
          return;
        }
        onChange(!checked);
      }}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
        disabled
          ? "cursor-not-allowed bg-zinc-200 opacity-60"
          : checked
            ? "bg-emerald-600"
            : "bg-zinc-300 hover:bg-zinc-400"
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block size-6 rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function BusinessSettingsScreen() {
  const navigate = useNavigate();
  const { data: settings, setData } = usePartnerResource(fetchBusinessSettings);
  const [closeAccountOpen, setCloseAccountOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  const patch = async (next: Partial<BusinessSettings>, message: string) => {
    if (!settings) return;
    setData({ ...settings, ...next });
    await updateBusinessSettings(next);
    toast.success(message);
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      void navigate({ to: partnerRoutes.dashboard });
    }
  };

  return (
    <PartnerLayout
      activeTab="profile"
      hideBottomNav={true}
      title="Store Settings"
      subtitle="Operational rules, availability toggles & order limits"
    >
      {/* ========================================================================= */}
      {/* 1. DEDICATED NATIVE MOBILE SETTINGS LAYOUT (< md)                         */}
      {/* ========================================================================= */}
      <div className="min-h-screen bg-[#F4F5F7] pb-24 text-zinc-900 md:hidden">
        {/* Sticky Mobile App Bar */}
        <header className="sticky top-0 z-30 flex h-15 items-center justify-between border-b border-zinc-200/80 bg-white/95 px-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGoBack}
              aria-label="Back"
              className="flex size-9.5 items-center justify-center rounded-full bg-zinc-100 text-zinc-800 shadow-2xs active:scale-95 cursor-pointer hover:bg-zinc-200 transition-all"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h1 className="text-base font-black tracking-tight text-zinc-900 leading-tight">
                Store Settings
              </h1>
              <p className="text-[11px] font-semibold text-zinc-500">
                Operating rules & capacities
              </p>
            </div>
          </div>

          {/* Live Store Pill */}
          {settings && (
            <span
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                settings.isStoreOpen
                  ? "border border-emerald-300 bg-emerald-50 text-emerald-800 shadow-2xs"
                  : "border border-zinc-200 bg-zinc-100 text-zinc-600"
              }`}
            >
              <span
                className={`size-2 rounded-full ${
                  settings.isStoreOpen ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
                }`}
              />
              {settings.isStoreOpen ? "Online" : "Offline"}
            </span>
          )}
        </header>

        {/* Mobile Settings Content */}
        <div className="p-4 space-y-5">
          {!settings ? (
            <div className="space-y-4 pt-2">
              <PartnerListSkeleton />
            </div>
          ) : (
            <>
              {/* Card 1: Master Store Online/Offline Banner */}
              <div
                onClick={() =>
                  void patch(
                    { isStoreOpen: !settings.isStoreOpen },
                    !settings.isStoreOpen ? "Store opened" : "Store closed"
                  )
                }
                className={`flex items-center justify-between rounded-2xl border-2 p-4 transition-all cursor-pointer shadow-xs ${
                  settings.isStoreOpen
                    ? "border-emerald-500 bg-gradient-to-br from-emerald-50/90 via-white to-white"
                    : "border-zinc-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl shadow-xs transition-colors ${
                      settings.isStoreOpen ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    <Power className="size-5.5" strokeWidth={2.4} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-zinc-900 leading-tight">
                      {settings.isStoreOpen ? "Store is ONLINE" : "Store is OFFLINE"}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-zinc-500 leading-snug">
                      {settings.isStoreOpen
                        ? "Accepting customer laundry orders"
                        : "Orders paused. Switch ON to accept orders"}
                    </p>
                  </div>
                </div>

                <SwitchToggle
                  label="Store Open"
                  checked={settings.isStoreOpen}
                  onChange={(next) =>
                    void patch({ isStoreOpen: next }, next ? "Store opened" : "Store closed")
                  }
                />
              </div>

              {/* Card 2: Order Controls & Feature Toggles */}
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-wider text-zinc-400 px-1">
                  Order Controls & Features
                </p>

                <div className="rounded-2xl border border-zinc-200/90 bg-white overflow-hidden shadow-xs divide-y divide-zinc-100">
                  {/* Accepting New Orders */}
                  <div
                    onClick={() =>
                      void patch(
                        { acceptingNewOrders: !settings.acceptingNewOrders },
                        !settings.acceptingNewOrders ? "Accepting orders" : "Orders paused"
                      )
                    }
                    className="flex items-center justify-between p-4 gap-3 transition-colors hover:bg-zinc-50/60 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex size-9.5 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Bike className="size-5" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-zinc-900">Accepting New Orders</p>
                        <p className="text-xs font-medium text-zinc-500 truncate">
                          Pause if machine capacity is full
                        </p>
                      </div>
                    </div>
                    <SwitchToggle
                      label="Accepting New Orders"
                      checked={settings.acceptingNewOrders}
                      onChange={(next) =>
                        void patch(
                          { acceptingNewOrders: next },
                          next ? "Accepting orders" : "Orders paused"
                        )
                      }
                    />
                  </div>

                  {/* Auto-Accept Orders (Coming Soon) */}
                  <div
                    onClick={() => toast.info("Auto-Accept Orders feature is coming soon!")}
                    className="flex items-center justify-between p-4 gap-3 bg-zinc-50/50 cursor-not-allowed opacity-80"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex size-9.5 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <Zap className="size-5" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-zinc-900">Auto-Accept Orders</p>
                          <span className="rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[9px] font-black uppercase text-amber-800">
                            Coming Soon
                          </span>
                        </div>
                        <p className="text-xs font-medium text-zinc-500 truncate">
                          Automatically queue incoming bookings
                        </p>
                      </div>
                    </div>
                    <SwitchToggle
                      label="Auto-Accept Orders"
                      checked={false}
                      disabled={true}
                      onDisabledClick={() => toast.info("Auto-Accept Orders feature is coming soon!")}
                      onChange={() => {}}
                    />
                  </div>

                  {/* Express Delivery */}
                  <div
                    onClick={() =>
                      void patch(
                        { expressDelivery: !settings.expressDelivery },
                        "Express delivery updated"
                      )
                    }
                    className="flex items-center justify-between p-4 gap-3 transition-colors hover:bg-zinc-50/60 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex size-9.5 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                        <Timer className="size-5" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-zinc-900">Express Delivery</p>
                        <p className="text-xs font-medium text-zinc-500 truncate">
                          12-hour turnaround for rush bookings
                        </p>
                      </div>
                    </div>
                    <SwitchToggle
                      label="Express Delivery"
                      checked={settings.expressDelivery}
                      onChange={(next) =>
                        void patch({ expressDelivery: next }, "Express delivery updated")
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Operational Limits & Hours */}
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-wider text-zinc-400 px-1">
                  Store Limits & Timings
                </p>

                <div className="rounded-2xl border border-zinc-200/90 bg-white overflow-hidden shadow-xs divide-y divide-zinc-100">
                  {/* Working Hours */}
                  <div className="flex items-center justify-between p-4 gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex size-9.5 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Clock3 className="size-5" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-zinc-900">Working Hours</p>
                        <p className="text-xs font-medium text-zinc-500 truncate">Store daily operating hours</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-black text-zinc-900">
                      {settings.openingTime} – {settings.closingTime}
                    </span>
                  </div>

                  {/* Pickup Radius */}
                  <div className="flex items-center justify-between p-4 gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex size-9.5 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <Gauge className="size-5" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-zinc-900">Pickup Radius</p>
                        <p className="text-xs font-medium text-zinc-500 truncate">Max delivery boundary</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-black text-zinc-900">
                      {settings.pickupRadiusKm} km
                    </span>
                  </div>

                  {/* Daily Order Cap */}
                  <div className="flex items-center justify-between p-4 gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex size-9.5 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                        <Sliders className="size-5" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-zinc-900">Daily Order Cap</p>
                        <p className="text-xs font-medium text-zinc-500 truncate">Maximum daily capacity</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-black text-zinc-900">
                      {settings.dailyOrderCap} orders
                    </span>
                  </div>

                  {/* Weekly Off Day */}
                  <div className="flex items-center justify-between p-4 gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex size-9.5 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <Clock3 className="size-5" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-zinc-900">Weekly Off Day</p>
                        <p className="text-xs font-medium text-zinc-500 truncate">Scheduled maintenance day</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-black text-zinc-900">
                      {settings.weeklyOff || "None (7 Days Open)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 4: Policies & Grievance Desk */}
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-wider text-zinc-400 px-1">
                  Policies & Legal
                </p>

                <div className="rounded-2xl border border-zinc-200/90 bg-white overflow-hidden shadow-xs divide-y divide-zinc-100">
                  <a
                    href="https://quickpress.in/#privacy"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-4 gap-3 transition-colors hover:bg-zinc-50/60 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-lg">🛡️</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-zinc-900">Privacy Policy</p>
                        <p className="text-xs font-medium text-zinc-500 truncate">Partner data & KYC protection</p>
                      </div>
                    </div>
                    <ChevronRight className="size-4.5 text-zinc-400 shrink-0" />
                  </a>

                  <a
                    href="https://quickpress.in/#terms"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-4 gap-3 transition-colors hover:bg-zinc-50/60 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-lg">📜</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-zinc-900">Terms & Conditions</p>
                        <p className="text-xs font-medium text-zinc-500 truncate">Merchant SLA & Quality Codes</p>
                      </div>
                    </div>
                    <ChevronRight className="size-4.5 text-zinc-400 shrink-0" />
                  </a>

                  <div className="flex items-center justify-between p-4 gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-lg">💳</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-zinc-900">Payment & Settlement</p>
                        <p className="text-xs font-medium text-zinc-500 truncate">Automated bank payouts</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-800">
                      Active
                    </span>
                  </div>

                  <a
                    href="mailto:official.quickpress@gmail.com?subject=Partner%20Grievance%20Redressal"
                    className="flex items-center justify-between p-4 gap-3 transition-colors hover:bg-zinc-50/60 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-lg">⚖️</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-zinc-900">Grievance Desk</p>
                        <p className="text-xs font-medium text-zinc-500 truncate">Disputes & merchant support</p>
                      </div>
                    </div>
                    <ExternalLink className="size-4 text-zinc-400 shrink-0" />
                  </a>
                </div>
              </div>

              {/* Card 5: Danger Zone */}
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-wider text-red-500 px-1">
                  Account Management
                </p>

                <div className="rounded-2xl border border-red-200 bg-white overflow-hidden shadow-xs">
                  <div
                    onClick={() => setCloseAccountOpen(true)}
                    className="flex items-center justify-between p-4 gap-3 hover:bg-red-50/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex size-9.5 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                        <Trash2 className="size-5" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-red-600">Request Store Account Closure</p>
                        <p className="text-xs font-medium text-zinc-500 truncate">
                          De-list your store from QuickPress
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="size-4.5 text-red-400 shrink-0" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DESKTOP SETTINGS LAYOUT (>= md)                                        */}
      {/* ========================================================================= */}
      <div className="hidden mx-auto w-full max-w-5xl px-8 py-6 md:block">
        {!settings ? (
          <PartnerListSkeleton />
        ) : (
          <div className="animate-soft-fade space-y-6 pb-12">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Availability Toggles */}
              <section className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
                    <Sliders className="size-4" strokeWidth={2.3} />
                  </span>
                  <div>
                    <h2 className="text-sm font-black text-zinc-900">
                      Store Availability & Controls
                    </h2>
                    <p className="text-[11px] font-medium text-zinc-500">
                      Real-time switches for accepting orders & operations
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div
                    onClick={() =>
                      void patch(
                        { isStoreOpen: !settings.isStoreOpen },
                        !settings.isStoreOpen ? "Store opened" : "Store closed"
                      )
                    }
                    className="flex items-center justify-between p-4 rounded-2xl border border-zinc-200/80 hover:border-zinc-300 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <Power className="size-5" />
                      </span>
                      <div>
                        <p className="text-sm font-black text-zinc-900">Store Open</p>
                        <p className="text-xs text-zinc-500">Customers can place orders now</p>
                      </div>
                    </div>
                    <SwitchToggle
                      label="Store Open"
                      checked={settings.isStoreOpen}
                      onChange={(next) =>
                        void patch({ isStoreOpen: next }, next ? "Store opened" : "Store closed")
                      }
                    />
                  </div>

                  <div
                    onClick={() =>
                      void patch(
                        { acceptingNewOrders: !settings.acceptingNewOrders },
                        !settings.acceptingNewOrders ? "Accepting orders" : "Orders paused"
                      )
                    }
                    className="flex items-center justify-between p-4 rounded-2xl border border-zinc-200/80 hover:border-zinc-300 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Bike className="size-5" />
                      </span>
                      <div>
                        <p className="text-sm font-black text-zinc-900">Accepting New Orders</p>
                        <p className="text-xs text-zinc-500">Pause when capacity is reached</p>
                      </div>
                    </div>
                    <SwitchToggle
                      label="Accepting Orders"
                      checked={settings.acceptingNewOrders}
                      onChange={(next) =>
                        void patch(
                          { acceptingNewOrders: next },
                          next ? "Accepting orders" : "Orders paused"
                        )
                      }
                    />
                  </div>

                  <div
                    onClick={() => toast.info("Auto-Accept Orders feature is coming soon!")}
                    className="flex items-center justify-between p-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 cursor-not-allowed opacity-80"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <Zap className="size-5" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-zinc-900">Auto-Accept Orders</p>
                          <span className="rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[9px] font-black uppercase text-amber-800">
                            Coming Soon
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500">Queue bookings without manual verification</p>
                      </div>
                    </div>
                    <SwitchToggle
                      label="Auto-Accept Orders"
                      checked={false}
                      disabled={true}
                      onDisabledClick={() => toast.info("Auto-Accept Orders feature is coming soon!")}
                      onChange={() => {}}
                    />
                  </div>

                  <div
                    onClick={() =>
                      void patch(
                        { expressDelivery: !settings.expressDelivery },
                        "Express delivery updated"
                      )
                    }
                    className="flex items-center justify-between p-4 rounded-2xl border border-zinc-200/80 hover:border-zinc-300 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                        <Timer className="size-5" />
                      </span>
                      <div>
                        <p className="text-sm font-black text-zinc-900">Express Delivery</p>
                        <p className="text-xs text-zinc-500">12-hour turnaround for express bookings</p>
                      </div>
                    </div>
                    <SwitchToggle
                      label="Express Delivery"
                      checked={settings.expressDelivery}
                      onChange={(next) =>
                        void patch({ expressDelivery: next }, "Express delivery updated")
                      }
                    />
                  </div>
                </div>
              </section>

              {/* Operational Limits */}
              <section className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600">
                    <Clock3 className="size-4" strokeWidth={2.3} />
                  </span>
                  <div>
                    <h2 className="text-sm font-black text-zinc-900">
                      Operational Limits & Hours
                    </h2>
                    <p className="text-[11px] font-medium text-zinc-500">
                      Configured operating hours and service bounds
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      icon: Clock3,
                      label: "Working Hours",
                      subtitle: "Store daily timing",
                      value: `${settings.openingTime} – ${settings.closingTime}`,
                      color: "text-blue-600 bg-blue-50",
                    },
                    {
                      icon: Gauge,
                      label: "Pickup Radius",
                      subtitle: "Maximum captain dispatch radius",
                      value: `${settings.pickupRadiusKm} km`,
                      color: "text-emerald-600 bg-emerald-50",
                    },
                    {
                      icon: Sliders,
                      label: "Daily Order Cap",
                      subtitle: "Max capacity limit",
                      value: `${settings.dailyOrderCap} orders`,
                      color: "text-purple-600 bg-purple-50",
                    },
                    {
                      icon: Clock3,
                      label: "Weekly Off Day",
                      subtitle: "Store maintenance off day",
                      value: settings.weeklyOff || "None (Open 7 Days)",
                      color: "text-amber-600 bg-amber-50",
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between p-3.5 rounded-2xl border border-zinc-200/80 bg-zinc-50/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`flex size-9 items-center justify-center rounded-xl ${row.color}`}>
                          <row.icon className="size-4.5" strokeWidth={2.2} />
                        </span>
                        <div>
                          <p className="text-xs font-bold text-zinc-900">{row.label}</p>
                          <p className="text-[10px] text-zinc-500">{row.subtitle}</p>
                        </div>
                      </div>
                      <span className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-black text-zinc-900 shadow-2xs">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Compliance & Closure on Desktop */}
            <section className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-zinc-100">
                <span className="flex size-8 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
                  <ShieldCheck className="size-4" strokeWidth={2.3} />
                </span>
                <div>
                  <h3 className="text-sm font-black text-zinc-900">Compliance & Partner Policies</h3>
                  <p className="text-[10px] text-zinc-500">
                    QuickPress Merchant Agreement, Grievance Redressal & Account Management
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <a
                  href="https://quickpress.in/#privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-zinc-200/80 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🛡️</span>
                    <div>
                      <p className="text-xs font-bold text-zinc-900">Privacy Policy</p>
                      <p className="text-[10px] text-zinc-500">Partner data safety</p>
                    </div>
                  </div>
                  <ExternalLink className="size-3.5 text-zinc-400" />
                </a>

                <a
                  href="https://quickpress.in/#terms"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-zinc-200/80 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📜</span>
                    <div>
                      <p className="text-xs font-bold text-zinc-900">Terms & Conditions</p>
                      <p className="text-[10px] text-zinc-500">Merchant SLA</p>
                    </div>
                  </div>
                  <ExternalLink className="size-3.5 text-zinc-400" />
                </a>

                <button
                  type="button"
                  onClick={() => setCloseAccountOpen(true)}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-red-200 bg-red-50/50 hover:bg-red-50 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 className="size-4.5 text-red-600" />
                    <div>
                      <p className="text-xs font-black text-red-700">Account Closure</p>
                      <p className="text-[10px] text-red-500">De-list store request</p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-red-400" />
                </button>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Account Closure Confirmation Dialog */}
      {closeAccountOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-zinc-200 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <span className="mx-auto flex size-14 items-center justify-center rounded-3xl bg-red-100 text-red-600 ring-8 ring-red-50">
              <Trash2 className="size-6" />
            </span>
            <div className="space-y-1">
              <h3 className="text-base font-black text-zinc-900">Request Store Account Closure?</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Closing your store account will pause all incoming laundry orders and initiate permanent partner merchant de-listing.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-[11px] text-zinc-600 text-left leading-relaxed">
              ⚖️ <strong>Statutory Notice:</strong> Data retention policies apply for past completed tax transactions, compliance records, and active partner settlements.
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCloseAccountOpen(false)}
                className="flex-1 h-11 rounded-2xl border border-zinc-200 bg-white text-xs font-bold text-zinc-700 hover:bg-zinc-100 active:scale-[0.97] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setClosing(true);
                  setTimeout(() => {
                    setClosing(false);
                    setCloseAccountOpen(false);
                    toast.success("Account closure request submitted to partner operations.");
                  }, 1200);
                }}
                disabled={closing}
                className="flex-1 h-11 rounded-2xl bg-red-600 text-xs font-black text-white hover:bg-red-700 active:scale-[0.97] transition-all cursor-pointer disabled:opacity-50"
              >
                {closing ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Toaster />
    </PartnerLayout>
  );
}
