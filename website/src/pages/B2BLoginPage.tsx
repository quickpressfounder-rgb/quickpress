import React, { useState } from "react";
import { PageType, ModalType } from "@/types";

// Clean, sharp vector outline icons (Strictly NO cartoon emojis)
const IconBuilding = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" />
  </svg>
);

const IconShieldCheck = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const IconLock = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconArrowRight = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const IconTruck = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const IconCheck = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export function B2BLoginPage({
  onNavigate,
  onOpenModal,
}: {
  onNavigate: (page: PageType) => void;
  onOpenModal: (type: ModalType) => void;
}) {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [identifier, setIdentifier] = useState("");
  const [useOtp, setUseOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMsg("Please enter your B2B Client ID, Mobile Number, or Work Email");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/b2b/client/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          b2bIdOrPhone: identifier.trim(),
          otp: useOtp ? otp : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Authentication failed");
      }

      // Save session in localStorage
      localStorage.setItem("qp_b2b_token", data.token);
      localStorage.setItem("qp_b2b_client", JSON.stringify(data.client));

      // Direct client to the B2B Portal & Bulk Order Management
      onNavigate("b2b-portal");
      window.location.hash = "#b2b/portal";
    } catch (err: any) {
      setErrorMsg(err.message || "Unable to connect. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 pt-24 sm:pt-28 pb-24 font-sans">
      <div className="max-w-xl mx-auto px-4 sm:px-6">
        {/* Top Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-300 bg-white text-zinc-800 text-[11px] font-mono tracking-widest uppercase mb-3 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>COMMERCIAL ENTERPRISE DESK</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight uppercase font-mono">
            B2B Client Portal Access
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-zinc-600 max-w-md mx-auto">
            Authorized management console for Hotels, Hospitals, Hostels/PGs, and Commercial Laundromat Facilities.
          </p>
        </div>

        {/* Tab Selector: Login vs Register */}
        <div className="bg-white border-2 border-zinc-900 rounded-3xl shadow-xl overflow-hidden">
          <div className="grid grid-cols-2 border-b-2 border-zinc-900 bg-zinc-100 text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveTab("login")}
              className={`py-3.5 px-4 font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "login"
                  ? "bg-black text-white"
                  : "text-zinc-600 hover:text-black bg-zinc-100"
              }`}
            >
              <IconLock className="w-4 h-4" />
              <span>COMMERCIAL LOGIN</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onNavigate("b2b-partner");
                window.location.hash = "#b2b";
              }}
              className="py-3.5 px-4 font-bold text-zinc-600 hover:text-black transition flex items-center justify-center gap-2 cursor-pointer bg-zinc-100"
            >
              <IconBuilding className="w-4 h-4" />
              <span>NEW REGISTRATION</span>
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5 font-mono">
                  B2B Client ID, Mobile Number, or Work Email <span className="text-black font-black">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. QP-B2B-108291 or 9876543210"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-sm font-medium bg-zinc-50/50 focus:bg-white text-zinc-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition"
                    required
                  />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Enter your assigned <span className="font-mono font-bold text-zinc-700">QP-B2B-XXXXXX</span> ID or registered facility phone number.
                </p>
              </div>

              {/* Instant Access Mode */}
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 space-y-1">
                <div className="flex items-center gap-2 text-zinc-900 font-bold">
                  <IconShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Verified Commercial Entity Verification</span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Instant secure access to dispatch daily van pickups, review doorstep scale readings, and download 18% GST tax invoices.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-xl bg-black hover:bg-zinc-800 text-white font-mono font-bold text-sm uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                {loading ? (
                  <span>Authenticating Facility...</span>
                ) : (
                  <>
                    <span>Enter Commercial Command Portal</span>
                    <IconArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Helper for User convenience */}
            <div className="pt-4 border-t border-zinc-200 text-center space-y-2">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                Need Help Accessing Your Facility Account?
              </span>
              <p className="text-xs text-zinc-600">
                Contact Enterprise Account Desk:{" "}
                <a href="tel:+919876543210" className="font-bold text-black underline">
                  +91 90000 00000
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-3 gap-3 mt-8 text-center text-xs">
          <div className="bg-white p-3 rounded-2xl border border-zinc-200">
            <IconTruck className="w-5 h-5 mx-auto mb-1 text-black" />
            <span className="font-bold text-zinc-900 block font-mono text-[11px]">Daily Van Pickup</span>
            <span className="text-[10px] text-zinc-500">Multi-bag QR seals</span>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-zinc-200">
            <IconBuilding className="w-5 h-5 mx-auto mb-1 text-black" />
            <span className="font-bold text-zinc-900 block font-mono text-[11px]">Dual Scale Weight</span>
            <span className="text-[10px] text-zinc-500">Zero variance loss</span>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-zinc-200">
            <IconShieldCheck className="w-5 h-5 mx-auto mb-1 text-black" />
            <span className="font-bold text-zinc-900 block font-mono text-[11px]">GST Tax Invoice</span>
            <span className="text-[10px] text-zinc-500">HSN 9987 & Ledger</span>
          </div>
        </div>
      </div>
    </div>
  );
}
