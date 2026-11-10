import React, { useEffect, useState } from "react";
import { CheckCircle2, FileText, Info, ShieldCheck, Sparkles, X, Zap } from "lucide-react";
import { fetchCaptainGuidelines, type CaptainGuidelinesResponse } from "../../api/rider/rider-support-api";

interface CaptainGuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CaptainGuidelinesModal: React.FC<CaptainGuidelinesModalProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<CaptainGuidelinesResponse>({
    ok: true,
    platformName: "QuickPress Logistics",
    slides: [
      {
        id: 1,
        badge: "0% COMMISSION",
        title: "Zero Commission, 100% Earnings",
        subtitle: "All trip fares and customer tips go straight to your wallet. Zero platform commission deductions!",
        highlight: "Daily Direct Bank Payouts",
        color: "emerald",
      },
      {
        id: 2,
        badge: "SMART DISPATCH",
        title: "Live Ride & Delivery Dispatches",
        subtitle: "Receive instant orders on your mobile with live GPS tracking directly in your work zone.",
        highlight: "High Demand Work Zones",
        color: "amber",
      },
      {
        id: 3,
        badge: "FULL FLEXIBILITY",
        title: "Flexible Working Hours",
        subtitle: "Work whenever you want. Turn ON DUTY and start earning on your own schedule.",
        highlight: "Be Your Own Boss",
        color: "blue",
      },
    ],
    guidelines: [
      {
        title: "1. Customer Doorstep Pickup",
        desc: "Reach customer doorstep on time. Count items with customer and enter the 6-digit Customer Pickup OTP before picking up clothes.",
      },
      {
        title: "2. Store Drop & Washing Handover",
        desc: "Drop clothes safely at the partner store. Swipe 'Arrival to Store & Handover'. Partner cannot start washing until you reach store.",
      },
      {
        title: "3. Store Drop Opt-Out Choice",
        desc: "Need to leave after store drop? Select 'Leave Trip at Store' to collect 75% net pickup payout (25% fee deducted). The delivery leg is reassigned to a new captain with a +20% bonus incentive.",
      },
      {
        title: "4. Partner Dispatch OTP & Ready Delivery",
        desc: "When clothes are washed and ironed, pick them from the partner store using the Partner Dispatch OTP.",
      },
      {
        title: "5. Customer Delivery OTP & Instant Payout",
        desc: "Deliver clean clothes to the customer, enter Customer Delivery OTP, and receive instant earnings credited to your wallet with 0% deduction.",
      },
    ],
  });

  useEffect(() => {
    if (!isOpen) return;
    fetchCaptainGuidelines()
      .then((res) => {
        if (res && res.guidelines?.length) setData(res);
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm max-h-[85vh] bg-white rounded-3xl p-5 shadow-2xl space-y-4 flex flex-col text-neutral-900 animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-2xl bg-blue-100 text-blue-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-neutral-950">Captain Guidelines & SOP</h3>
              <p className="text-[11px] font-medium text-blue-700 font-mono">Standard Operating Procedures</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
          {/* 3 Value Pillars */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-neutral-400">
              Captain Core Benefits
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {data.slides.map((s) => (
                <div
                  key={s.id}
                  className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {s.badge}
                    </span>
                    <span className="text-[11px] font-bold text-neutral-700">{s.highlight}</span>
                  </div>
                  <h5 className="text-xs font-black text-neutral-950">{s.title}</h5>
                  <p className="text-[11px] text-neutral-600 leading-tight">{s.subtitle}</p>
                </div>
              ))}
            </div>
          </div>

          {/* SOP Steps */}
          <div className="space-y-2.5 pt-2 border-t border-neutral-100">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-neutral-400">
              5-Step Order Lifecycle SOP
            </h4>
            <div className="space-y-2">
              {data.guidelines.map((g, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-1"
                >
                  <h5 className="text-xs font-black text-neutral-900 flex items-center gap-1.5">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                    <span>{g.title}</span>
                  </h5>
                  <p className="text-[11px] text-neutral-600 leading-relaxed">{g.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Done Button */}
        <div className="pt-2 border-t border-neutral-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-black text-xs rounded-xl active:scale-98 transition-all"
          >
            I Understand (समझ गया) ✓
          </button>
        </div>
      </div>
    </div>
  );
};
