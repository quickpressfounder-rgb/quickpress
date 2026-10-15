import React, { useEffect, useState, useRef } from "react";
import {
  Bike,
  Clock,
  Flame,
  Phone,
  Printer,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { playUrgentSlaBuzzer } from "../../lib/partner-order-alert-sound";
import { printThermalOrderTag, type ThermalPrintOrderData } from "../../lib/thermal-printer";

// =========================================================================
// 1. VISUAL GARMENT SUMMARY CHIPS WITH EMOJI ICONS
// =========================================================================

export function getGarmentIcon(name: string): string {
  const n = (name || "").toLowerCase();
  if (n.includes("shirt") || n.includes("t-shirt") || n.includes("tshirt") || n.includes("kurta") || n.includes("kurti") || n.includes("top")) {
    return "👕";
  }
  if (n.includes("pant") || n.includes("trouser") || n.includes("jean") || n.includes("pajama") || n.includes("pyjama") || n.includes("lower") || n.includes("track")) {
    return "👖";
  }
  if (
    n.includes("bedsheet") ||
    n.includes("sheet") ||
    n.includes("quilt") ||
    n.includes("blanket") ||
    n.includes("dohar") ||
    n.includes("duvet") ||
    n.includes("pillow") ||
    n.includes("comforter") ||
    n.includes("linen")
  ) {
    return "🛏️";
  }
  if (n.includes("saree") || n.includes("sari") || n.includes("suit") || n.includes("dress") || n.includes("lehenga") || n.includes("gown") || n.includes("anarkali")) {
    return "👗";
  }
  if (n.includes("jacket") || n.includes("blazer") || n.includes("coat") || n.includes("hoodie") || n.includes("sweater") || n.includes("cardigan")) {
    return "🧥";
  }
  if (n.includes("towel") || n.includes("bath")) {
    return "🧖";
  }
  if (n.includes("shoe") || n.includes("sneaker") || n.includes("boot")) {
    return "👟";
  }
  if (n.includes("sock") || n.includes("underwear") || n.includes("brief") || n.includes("boxer") || n.includes("vest")) {
    return "🧦";
  }
  if (n.includes("curtain") || n.includes("drape")) {
    return "🪟";
  }
  return "🧺";
}

interface GarmentItem {
  id?: string;
  name: string;
  qty?: number;
  service?: string;
}

export function GarmentSummaryChips({
  items,
  itemCount,
  services,
}: {
  items?: GarmentItem[];
  itemCount?: number;
  services?: string[];
}) {
  if (items && items.length > 0) {
    return (
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        {items.map((item, idx) => {
          const icon = getGarmentIcon(item.name);
          const qty = item.qty || 1;
          return (
            <span
              key={item.id || `${item.name}-${idx}`}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-black text-black shadow-2xs"
            >
              <span className="text-sm select-none">{icon}</span>
              <span className="font-bold text-black">
                {qty}× {item.name}
              </span>
              {item.service && (
                <span className="text-[10px] font-semibold text-zinc-500 capitalize">
                  ({item.service})
                </span>
              )}
            </span>
          );
        })}
      </div>
    );
  }

  // Fallback if no item details provided
  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
      <span className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-black text-black shadow-2xs">
        <span className="text-sm select-none">🧺</span>
        <span className="font-bold text-black">{itemCount || 1} Garment Pieces</span>
      </span>
      {services && services.length > 0 && (
        <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-bold text-black">
          {services.join(", ")}
        </span>
      )}
    </div>
  );
}

// =========================================================================
// 2. LIVE 2:00 MIN SLA ACCEPTANCE COUNTDOWN TIMER WITH URGENT BUZZER
// =========================================================================

export function OrderSlaAcceptanceTimer({
  placedAt,
  deadline,
  isNew,
}: {
  placedAt?: string;
  deadline?: string;
  isNew: boolean;
}) {
  const [remainingSec, setRemainingSec] = useState<number>(() => {
    if (!isNew) return 0;
    const now = Date.now();
    if (deadline) {
      const target = new Date(deadline).getTime();
      return Math.max(0, Math.floor((target - now) / 1000));
    }
    if (placedAt) {
      const placed = new Date(placedAt).getTime();
      const target = placed + 3 * 60 * 1000; // 3-minute SLA
      const diff = Math.floor((target - now) / 1000);
      return diff > 0 ? Math.min(diff, 180) : 180;
    }
    return 180; // Default 3 minutes
  });

  const lastUrgentBuzzerRef = useRef<number>(0);

  useEffect(() => {
    if (!isNew) return;

    const timer = setInterval(() => {
      setRemainingSec((prev) => {
        const next = Math.max(0, prev - 1);

        // Intensify buzzer if under 45s and unaccepted
        if (next > 0 && next <= 45) {
          const now = Date.now();
          if (now - lastUrgentBuzzerRef.current > 7000) {
            lastUrgentBuzzerRef.current = now;
            playUrgentSlaBuzzer();
          }
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isNew]);

  if (!isNew) return null;

  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const formatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const isUrgent = remainingSec <= 45;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black transition-all ${
        remainingSec === 0
          ? "bg-rose-100 text-rose-800 border border-rose-300"
          : isUrgent
            ? "bg-rose-600 text-white animate-pulse shadow-sm shadow-rose-500/40"
            : "bg-amber-100 text-black border border-amber-300"
      }`}
      title="Store must accept within 2-Minute SLA before automatic cancellation"
    >
      {isUrgent ? (
        <Flame className="size-3.5 fill-current text-white animate-bounce" />
      ) : (
        <Timer className="size-3.5 text-black" />
      )}
      <span className="tracking-tight">
        {remainingSec === 0 ? "SLA Expired" : isUrgent ? `🔥 SLA: ${formatted} ACCEPT NOW!` : `Accept: ${formatted}`}
      </span>
    </div>
  );
}

// =========================================================================
// 3. DIRECT 1-TAP CALL & WHATSAPP QUICK BUTTONS (CUSTOMER & CAPTAIN)
// =========================================================================

export function DirectContactActions({
  customerName,
  customerPhone,
  orderCode,
  riderName,
  riderPhone,
}: {
  customerName?: string;
  customerPhone?: string;
  orderCode: string;
  riderName?: string;
  riderPhone?: string;
}) {
  const cleanPhone = (customerPhone || "9876543210").replace(/\D/g, "").slice(-10);
  const cleanRiderPhone = (riderPhone || "").replace(/\D/g, "").slice(-10);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="flex flex-wrap items-center gap-1.5 pt-1"
    >
      {/* 1-Tap Call Customer */}
      <a
        href={`tel:+91${cleanPhone}`}
        className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-black active:scale-95 transition-all shadow-2xs"
        title={`Call Customer (+91 ${cleanPhone})`}
      >
        <Phone className="size-3 text-emerald-700" />
        <span>Call</span>
      </a>

      {/* 1-Tap Call Captain (If Rider Assigned) */}
      {cleanRiderPhone ? (
        <a
          href={`tel:+91${cleanRiderPhone}`}
          className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 text-[11px] font-black text-black active:scale-95 transition-all shadow-2xs"
          title={`Call Captain (+91 ${cleanRiderPhone})`}
        >
          <Bike className="size-3 text-blue-700" />
          <span>Call Captain</span>
        </a>
      ) : null}
    </div>
  );
}

// =========================================================================
// 4. INSTANT 4-DIGIT HANDOVER OTP INPUT (DIRECTLY ON CARD)
// =========================================================================

export function CardHandoverOtpInput({
  orderId,
  orderCode,
  onVerifyOtp,
}: {
  orderId: string;
  orderCode: string;
  onVerifyOtp: (orderId: string, otp: string) => Promise<void>;
}) {
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (otp.length !== 4 || isVerifying) return;

    setIsVerifying(true);
    try {
      await onVerifyOtp(orderId, otp);
      toast.success(`✓ Order #${orderCode} successfully handed over to Captain!`);
      setOtp("");
    } catch (err: any) {
      toast.error(err?.message || "Invalid Handover OTP. Ask delivery rider.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 space-y-2 mt-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-black flex items-center gap-1.5">
          <ShieldCheck className="size-4 text-blue-600" />
          Captain Handover OTP (कैप्टन ओटीपी)
        </span>
        <span className="text-[10px] font-bold text-zinc-600">
          Enter 4 digits from Rider
        </span>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="tel"
          maxLength={4}
          value={otp}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "").slice(0, 4);
            setOtp(val);
            if (val.length === 4) {
              // Auto-submit on 4 digits for 1-second instant speed
              setTimeout(() => {
                void onVerifyOtp(orderId, val)
                  .then(() => toast.success(`✓ Handover verified for #${orderCode}!`))
                  .catch((err) => toast.error(err?.message || "Invalid OTP"));
              }, 100);
            }
          }}
          placeholder="• • • •"
          className="w-28 text-center tracking-widest text-base font-black bg-white border border-zinc-300 rounded-lg py-1.5 text-black placeholder:text-zinc-400 focus:outline-none focus:border-blue-600 shadow-2xs"
        />

        <button
          type="button"
          disabled={otp.length !== 4 || isVerifying}
          onClick={handleSubmit}
          className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs py-2.5 px-3 flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs cursor-pointer"
        >
          {isVerifying ? "Verifying..." : "Verify & Dispatch ✓"}
        </button>
      </div>
    </div>
  );
}

// =========================================================================
// 5. 1-CLICK THERMAL RECEIPT & BAG TAG PRINT BUTTON
// =========================================================================

export function PrintBagTagButton({
  order,
}: {
  order: ThermalPrintOrderData;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        printThermalOrderTag(order);
        toast.success(`🖨️ Printing Laundry Bag Tag & Receipt for #${order.code}!`);
      }}
      className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white hover:bg-zinc-100 px-2.5 py-1 text-[11px] font-black text-black active:scale-95 transition-all shadow-2xs cursor-pointer"
      title="Print 58mm Thermal Laundry Bag Tag & Customer Receipt"
    >
      <Printer className="size-3 text-black" />
      <span>Print Tag</span>
    </button>
  );
}
