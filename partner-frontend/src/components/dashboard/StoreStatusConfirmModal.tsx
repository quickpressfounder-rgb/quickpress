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
 * - Clean White Background
 * - Pure Black Headings & High-Contrast Typography
 * - Visual Royal Blue Accents
 * - Zero 3D element clutter
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
      {/* Soft dark backdrop */}
      <div
        onClick={() => {
          if (!isLoading) onClose();
        }}
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
      />

      {/* Modal Dialog Card: Pure White, Flat, Hairline Border */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white border border-zinc-200 p-6 shadow-xl animate-in zoom-in-95 fade-in duration-200 text-center">
        {/* Close Button */}
        <button
          type="button"
          disabled={isLoading}
          onClick={onClose}
          className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-black transition-colors disabled:opacity-50 cursor-pointer"
        >
          <X className="size-4" />
        </button>

        {currentOnline ? (
          /* ============================================================== */
          /* 🔴 CONFIRMATION TO GO OFFLINE                                  */
          /* ============================================================== */
          <div className="space-y-4">
            {/* Flat Caution Icon */}
            <div className="relative mx-auto flex size-14 items-center justify-center rounded-2xl bg-zinc-100 border border-zinc-200 text-zinc-700">
              <PowerOff className="size-6 stroke-[2.2]" />
            </div>

            {/* Target Status Pill */}
            <div className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 border border-zinc-200 px-3 py-1 text-[11px] font-black uppercase text-black tracking-wider">
              <span className="size-1.5 rounded-full bg-amber-500" />
              <span>Switching to Offline</span>
            </div>

            {/* Headings */}
            <div>
              <h3 className="text-lg font-black tracking-tight text-black">
                Go Offline?
              </h3>
              <p className="text-xs font-bold text-black mt-0.5">
                क्या आप स्टोर को ऑफलाइन (बंद) करना चाहते हैं?
              </p>
            </div>

            {/* Explanatory notice */}
            <p className="text-xs text-black leading-relaxed font-semibold">
              You will <strong className="text-black font-black">stop receiving new customer laundry orders</strong>. Nearby customers will see your store as closed.
            </p>

            <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3 text-[11px] text-black font-semibold text-left flex items-start gap-2">
              <span className="text-black text-sm shrink-0">ℹ️</span>
              <span>Existing in-wash and ready orders will NOT be affected and can still be completed and handed over to Captains.</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={onClose}
                className="flex-1 rounded-full border border-zinc-300 bg-white hover:bg-zinc-100 py-3 text-xs font-bold text-black active:scale-95 transition-all cursor-pointer"
              >
                Keep Online
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => void onConfirm()}
                className="flex-1 rounded-full bg-black hover:bg-zinc-800 text-white py-3 text-xs font-black shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-75"
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
          /* ⚡ CONFIRMATION TO GO ONLINE (CLEAN ROYAL BLUE)                 */
          /* ============================================================== */
          <div className="space-y-4">
            {/* Flat Royal Blue Icon */}
            <div className="relative mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700">
              <Radio className="size-6 stroke-[2.2]" />
            </div>

            {/* Target Status Pill */}
            <div className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 border border-zinc-200 px-3 py-1 text-[11px] font-black uppercase text-black tracking-wider">
              <span className="size-1.5 rounded-full bg-emerald-600" />
              <span>Switching to Online</span>
            </div>

            {/* Headings */}
            <div>
              <h3 className="text-lg font-black tracking-tight text-black">
                Go Online?
              </h3>
              <p className="text-xs font-bold text-black mt-0.5">
                क्या आप स्टोर को ऑनलाइन (चालू) करना चाहते हैं?
              </p>
            </div>

            {/* Explanatory notice */}
            <p className="text-xs text-black leading-relaxed font-semibold">
              Your store will be instantly <strong className="text-black font-black">visible to nearby customers</strong>. New laundry bookings will alert here in real-time.
            </p>

            <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3 text-[11px] text-black font-semibold text-left flex items-start gap-2">
              <span className="text-blue-600 text-sm shrink-0">⚡</span>
              <span>Chime alerts are active. Keep your device volume audible to accept incoming orders within deadline.</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={onClose}
                className="flex-1 rounded-full border border-zinc-300 bg-white hover:bg-zinc-100 py-3 text-xs font-bold text-black active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => void onConfirm()}
                className="flex-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-xs font-black shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-75"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin text-white" />
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5 stroke-[2.5]" />
                    <span>Yes, Go Online</span>
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
