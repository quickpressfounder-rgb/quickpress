import React from "react";
import { Check, Clock, Package, Shirt, Truck } from "lucide-react";

export type JourneyStepId = "pickup" | "store_processing" | "delivery";

interface OrderJourneyStepperProps {
  currentStage: JourneyStepId;
  isStoreDropDone?: boolean;
  isDispatchDone?: boolean;
  isDelivered?: boolean;
  className?: string;
}

export const OrderJourneyStepper: React.FC<OrderJourneyStepperProps> = ({
  currentStage,
  isStoreDropDone = false,
  isDispatchDone = false,
  isDelivered = false,
  className = "",
}) => {
  const steps: Array<{
    id: JourneyStepId;
    label: string;
    sublabel: string;
    icon: typeof Shirt;
  }> = [
    {
      id: "pickup",
      label: "1. Pickup",
      sublabel: "कस्टमर पिकअप",
      icon: Shirt,
    },
    {
      id: "store_processing",
      label: "2. Store & Wash",
      sublabel: "स्टोर ड्रॉप व धुलाई",
      icon: Package,
    },
    {
      id: "delivery",
      label: "3. Delivery",
      sublabel: "कस्टमर डिलीवरी",
      icon: Truck,
    },
  ];

  const getStepStatus = (stepId: JourneyStepId): "done" | "active" | "pending" => {
    if (stepId === "pickup") {
      if (isStoreDropDone || currentStage === "store_processing" || currentStage === "delivery" || isDelivered) {
        return "done";
      }
      return currentStage === "pickup" ? "active" : "pending";
    }

    if (stepId === "store_processing") {
      if (isDispatchDone || currentStage === "delivery" || isDelivered) {
        return "done";
      }
      if (currentStage === "store_processing") {
        return "active";
      }
      return "pending";
    }

    if (stepId === "delivery") {
      if (isDelivered) {
        return "done";
      }
      return currentStage === "delivery" ? "active" : "pending";
    }

    return "pending";
  };

  return (
    <div className={`w-full bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-zinc-200/90 shadow-xs ${className}`}>
      <div className="flex items-center justify-between relative">
        {/* Connecting track line */}
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-zinc-200 -z-0" />

        {steps.map((step, idx) => {
          const status = getStepStatus(step.id);
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex flex-col items-center text-center relative z-10 flex-1">
              {/* Step Circle */}
              <div
                className={`size-8.5 rounded-full flex items-center justify-center font-black transition-all duration-300 shadow-sm ${
                  status === "done"
                    ? "bg-emerald-600 text-white ring-2 ring-emerald-500/20"
                    : status === "active"
                    ? "bg-blue-600 text-white ring-4 ring-blue-500/30 animate-pulse scale-105"
                    : "bg-zinc-100 text-zinc-400 border border-zinc-200"
                }`}
              >
                {status === "done" ? (
                  <Check className="size-4.5 stroke-[3]" />
                ) : status === "active" ? (
                  <Icon className="size-4 stroke-[2.5]" />
                ) : (
                  <Icon className="size-4 opacity-60" />
                )}
              </div>

              {/* Labels */}
              <span
                className={`mt-1.5 text-[11px] font-black tracking-tight leading-tight ${
                  status === "done"
                    ? "text-emerald-800"
                    : status === "active"
                    ? "text-blue-900 font-extrabold"
                    : "text-zinc-400 font-medium"
                }`}
              >
                {step.label}
              </span>
              <span
                className={`text-[9.5px] leading-tight ${
                  status === "active" ? "text-blue-600 font-bold" : "text-zinc-400 font-medium"
                }`}
              >
                {step.sublabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
