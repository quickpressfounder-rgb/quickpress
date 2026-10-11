import { CheckCircle2, Loader2, PowerOff, Radio, X } from "lucide-react";

interface StoreStatusConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOnline: boolean;
  onConfirm: () => Promise<void> | void;
  isLoading?: boolean;
}

/**
 * QuickPress Store Online / Offline Confirmation Popup
 * - Neon-Blue electric styling for Online confirmation
 * - Slate/Amber caution styling for Offline confirmation
 * - Prevents accidental status flips with clear explanation in Hindi + English
 */
export function StoreStatusConfirmModal({
  isOpen,
  onClose,
  currentOnline,
  onConfirm,
  isLoading = false,
}: StoreStatusConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dimmed backdrop with soft blur */}
      <div
        onClick={() => {
          if (!isLoading) onClose();
        }}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-200"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white border border-slate-200/90 p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-200 text-center">
        {/* Decorative Neon Glow background lights */}
        <div className="pointer-events-none absolute -top-16 -right-16 size-36 rounded-full bg-cyan-400/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 size-36 rounded-full bg-blue-600/15 blur-2xl" />

        {/* Close Button */}
        <button
          type="button"
          disabled={isLoading}
          onClick={onClose}
          className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <X className="size-4" />
        </button>

        {currentOnline ? (
          /* ============================================================== */
          /* 🔴 CONFIRMATION TO GO OFFLINE                                  */
          /* ============================================================== */
          <div className="space-y-4">
            {/* Caution Icon */}
            <div className="relative mx-auto flex size-16 items-center justify-center rounded-3xl bg-slate-100 border-2 border-slate-300 text-slate-700 shadow-inner">
              <PowerOff className="size-7 stroke-[2.2]" />
              <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-amber-500 ring-2 ring-white" />
            </div>

            {/* Target Status Pill */}
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[11px] font-black uppercase text-amber-800 tracking-wider">
              <span className="size-1.5 rounded-full bg-amber-500" />
              <span>Switching to OFFLINE</span>
            </div>

            {/* Headings */}
            <div>
              <h3 className="text-lg font-black tracking-tight text-slate-900">
                Go Offline?
              </h3>
              <p className="text-xs font-bold text-slate-500 mt-0.5">
                क्या आप स्टोर को ऑफलाइन (बंद) करना चाहते हैं?
              </p>
            </div>

            {/* Explanatory notice */}
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              You will <strong className="text-slate-900 font-bold">stop receiving new customer laundry orders</strong>. Nearby customers will see your store as closed.
            </p>

            <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3 text-[11px] text-slate-600 font-medium text-left flex items-start gap-2">
              <span className="text-blue-600 text-sm shrink-0">ℹ️</span>
              <span>Existing in-wash and ready orders will NOT be affected and can still be completed and handed over to Captains.</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={onClose}
                className="flex-1 rounded-full border border-slate-200 bg-white hover:bg-slate-100 py-3 text-xs font-black text-slate-700 active:scale-95 transition-all cursor-pointer"
              >
                Keep Online
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => void onConfirm()}
                className="flex-1 rounded-full bg-slate-900 hover:bg-black text-white py-3 text-xs font-black shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-75"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin text-white" />
                ) : (
                  <span>Yes, Go Offline</span>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* ⚡ CONFIRMATION TO GO ONLINE (ELECTRIC NEON-BLUE)              */
          /* ============================================================== */
          <div className="space-y-4">
            {/* Glowing Neon-Blue Icon */}
            <div className="relative mx-auto flex size-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-[#00c6ff] via-[#0099ff] to-[#0072ff] text-white shadow-[0_0_30px_rgba(0,198,255,0.6)]">
              <Radio className="size-7 stroke-[2.2] animate-pulse" />
              <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-cyan-300 ring-2 ring-white shadow-[0_0_8px_#00c6ff] animate-ping" />
              <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-cyan-300 ring-2 ring-white" />
            </div>

            {/* Neon Blue Target Status Pill */}
            <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 border border-cyan-200/90 px-3 py-1 text-[11px] font-black uppercase text-cyan-800 tracking-wider shadow-[0_0_12px_rgba(0,198,255,0.2)]">
              <span className="size-1.5 rounded-full bg-[#00c6ff] shadow-[0_0_6px_#00c6ff]" />
              <span>Switching to ONLINE ⚡</span>
            </div>

            {/* Headings */}
            <div>
              <h3 className="text-lg font-black tracking-tight text-slate-900">
                Go Online?
              </h3>
              <p className="text-xs font-bold text-cyan-700 mt-0.5">
                क्या आप स्टोर को ऑनलाइन (चालू) करना चाहते हैं?
              </p>
            </div>

            {/* Explanatory notice */}
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Your store will be instantly <strong className="text-slate-900 font-bold">visible to nearby customers</strong>. New laundry bookings will alert here in real-time.
            </p>

            <div className="rounded-2xl bg-cyan-50/70 border border-cyan-200/80 p-3 text-[11px] text-cyan-950 font-medium text-left flex items-start gap-2 shadow-2xs">
              <span className="text-cyan-600 text-sm shrink-0">⚡</span>
              <span>Chime alerts are active. Keep your device volume audible to accept incoming orders within deadline.</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={onClose}
                className="flex-1 rounded-full border border-slate-200 bg-white hover:bg-slate-100 py-3 text-xs font-black text-slate-700 active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => void onConfirm()}
                className="flex-1 rounded-full bg-gradient-to-r from-[#00c6ff] via-[#0099ff] to-[#0072ff] hover:opacity-95 text-white py-3 text-xs font-black shadow-[0_0_20px_rgba(0,198,255,0.5)] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-75"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin text-white" />
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5 stroke-[2.5]" />
                    <span>Yes, Go Online ⚡</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
