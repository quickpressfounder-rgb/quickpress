import React, { useEffect, useState } from "react";
import { AlertTriangle, Headphones, Mail, MapPin, MessageSquare, Phone, PhoneCall, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { fetchCaptainSupport, type CaptainSupportResponse } from "../../api/rider/rider-support-api";

interface CaptainSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CaptainSupportModal: React.FC<CaptainSupportModalProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<CaptainSupportResponse>({
    ok: true,
    helplinePhone: "",
    supportEmail: "support@quickpress.app",
    whatsappUrl: "",
    emergencySosNumber: "112",
    workingHours: "24 Hours · 7 Days a Week (24/7)",
    hubAddress: "QuickPress Express Hub, Kasganj, Uttar Pradesh 207123",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetchCaptainSupport()
      .then((res) => {
        if (res && res.helplinePhone) setData(res);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-neutral-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-neutral-950">24/7 Captain Support</h3>
              <p className="text-[11px] font-medium text-emerald-700 font-mono">Live Support Desk</p>
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

        {/* Primary Helpline CTA */}
        <div className="p-4 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 border border-emerald-200 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
              Official Captain Helpline
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              24/7 Live
            </span>
          </div>
          <p className="text-lg font-black text-neutral-950 tracking-wide font-mono">
            {data.helplinePhone}
          </p>
          <a
            href={`tel:${data.helplinePhone.replace(/\s+/g, "")}`}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#00C853] hover:bg-[#00B248] text-white font-black text-xs rounded-xl shadow-md shadow-emerald-500/20 active:scale-98 transition-all"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call Support Now (मुफ्त कॉल)</span>
          </a>
        </div>

        {/* Action Buttons: Email Desk & SOS */}
        <div className="grid grid-cols-2 gap-2.5">
          <a
            href={`mailto:${data.supportEmail}?subject=Captain%20Support%20Request`}
            className="flex flex-col items-center justify-center p-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-100/50 text-emerald-900 active:scale-95 transition-all text-center space-y-1"
          >
            <Mail className="w-5 h-5 text-emerald-600" />
            <span className="text-xs font-black">Email Desk</span>
            <span className="text-[10px] text-emerald-700 font-medium">support@quickpress.app</span>
          </a>

          <a
            href={`tel:${data.emergencySosNumber}`}
            className="flex flex-col items-center justify-center p-3 rounded-2xl border border-red-200 bg-red-50/40 hover:bg-red-100/50 text-red-900 active:scale-95 transition-all text-center space-y-1"
          >
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <span className="text-xs font-black">Emergency SOS</span>
            <span className="text-[10px] text-red-700 font-medium">Police / 112</span>
          </a>
        </div>

        {/* Support Meta */}
        <div className="space-y-2 pt-2 border-t border-neutral-100 text-xs text-neutral-600">
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span className="font-mono text-[11px] truncate">{data.supportEmail}</span>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
            <span className="text-[11px] text-neutral-500 leading-tight">{data.hubAddress}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
