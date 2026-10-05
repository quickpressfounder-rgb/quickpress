import { useEffect, useState } from "react";
import { Toaster as Sonner, toast as sonnerToast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Format message to be concise, crisp, and clean:
 * - Strips emojis (🎉, 📦, 🔔, etc.)
 * - Simplifies order placement/confirmation to crisp "Success"
 * - Keeps toasts ultra-compact and focused
 */
function cleanMessage(msg: any): any {
  if (typeof msg !== "string") return msg;

  let text = msg
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
    .trim();

  const lower = text.toLowerCase();

  // If message is about order placement / confirmation, simplify to "Success"
  if (
    lower.includes("order placed") ||
    lower.includes("order is confirmed") ||
    lower.includes("order confirmed") ||
    lower.includes("order success") ||
    lower.includes("order booked")
  ) {
    return "Success";
  }

  // Simplify verbose "successfully" messages
  if (lower.includes("successfully") || lower.includes("successful")) {
    text = text.replace(/successfully!?/gi, "").replace(/successful!?/gi, "").trim();
  }

  if (!text) {
    return "Success";
  }

  return text;
}

// Intercept sonnerToast singleton methods to guarantee:
// 1. Single notification at any time (always dismiss previous toast immediately)
// 2. Concise message formatting
// 3. Snappy duration
let isPatched = false;
function patchSonnerToast() {
  if (isPatched || typeof window === "undefined") return;
  isPatched = true;

  const originalSuccess = sonnerToast.success.bind(sonnerToast);
  const originalError = sonnerToast.error.bind(sonnerToast);
  const originalInfo = sonnerToast.info.bind(sonnerToast);
  const originalWarning = sonnerToast.warning.bind(sonnerToast);
  const originalMessage = sonnerToast.message.bind(sonnerToast);

  sonnerToast.success = (data: any, options?: any) => {
    try { sonnerToast.dismiss(); } catch {}
    return originalSuccess(cleanMessage(data), {
      duration: 1800,
      ...options,
    });
  };

  sonnerToast.error = (data: any, options?: any) => {
    try { sonnerToast.dismiss(); } catch {}
    return originalError(cleanMessage(data), {
      duration: 2200,
      ...options,
    });
  };

  sonnerToast.info = (data: any, options?: any) => {
    try { sonnerToast.dismiss(); } catch {}
    return originalInfo(cleanMessage(data), {
      duration: 1800,
      ...options,
    });
  };

  sonnerToast.warning = (data: any, options?: any) => {
    try { sonnerToast.dismiss(); } catch {}
    return originalWarning(cleanMessage(data), {
      duration: 2000,
      ...options,
    });
  };

  sonnerToast.message = (data: any, options?: any) => {
    try { sonnerToast.dismiss(); } catch {}
    return originalMessage(cleanMessage(data), {
      duration: 1800,
      ...options,
    });
  };
}

if (typeof window !== "undefined") {
  patchSonnerToast();
}

export { sonnerToast as toast };

/**
 * Ultra-sleek, compact dynamic island floating capsule:
 * - Positioned safely above bottom action bars & tab bars (never blocks Track/Pay buttons)
 * - Single notification at a time with instant dismissal of previous toasts
 * - Minimal padding, crisp 12.5px typography, no clutter
 */
export function Toaster({ ...props }: ToasterProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    patchSonnerToast();
    setMounted(true);
  }, []);

  if (!mounted || typeof window === "undefined") {
    return null;
  }

  return (
    <>
      <style>{`
        [data-sonner-toaster],
        [data-sonner-toaster][data-x-position="center"],
        [data-sonner-toaster][data-x-position="left"],
        [data-sonner-toaster][data-x-position="right"] {
          position: fixed !important;
          bottom: max(90px, calc(env(safe-area-inset-bottom, 0px) + 82px)) !important;
          top: auto !important;
          left: 0 !important;
          right: 0 !important;
          width: 100% !important;
          max-width: 100vw !important;
          margin: 0 auto !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          pointer-events: none !important;
          z-index: 99999 !important;
          transform: none !important;
        }

        [data-sonner-toaster] ol {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 auto !important;
          padding: 0 16px !important;
          box-sizing: border-box !important;
          list-style: none !important;
          pointer-events: none !important;
        }

        [data-sonner-toast],
        [data-sonner-toaster] [data-sonner-toast],
        [data-sonner-toaster] [data-sonner-toast][data-x-position="center"],
        [data-sonner-toaster] [data-sonner-toast][data-x-position="left"],
        [data-sonner-toaster] [data-sonner-toast][data-x-position="right"] {
          position: relative !important;
          left: auto !important;
          right: auto !important;
          top: auto !important;
          bottom: auto !important;
          width: auto !important;
          max-width: min(calc(100vw - 32px), 320px) !important;
          margin-left: auto !important;
          margin-right: auto !important;
          display: inline-flex !important;
          flex-direction: row !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
          background: rgba(18, 18, 20, 0.94) !important;
          backdrop-filter: blur(16px) saturate(180%) !important;
          -webkit-backdrop-filter: blur(16px) saturate(180%) !important;
          color: #ffffff !important;
          border: 1px solid rgba(255, 255, 255, 0.14) !important;
          border-radius: 9999px !important;
          box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.25) !important;
          padding: 6px 16px !important;
          min-height: unset !important;
          height: auto !important;
          pointer-events: auto !important;
          box-sizing: border-box !important;
          transition: all 180ms cubic-bezier(0.16, 1, 0.3, 1) !important;
        }

        [data-sonner-toast] [data-content] {
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
          width: auto !important;
          max-width: 100% !important;
          margin: 0 auto !important;
          padding: 0 !important;
        }

        [data-sonner-toast] [data-title] {
          color: #ffffff !important;
          font-weight: 600 !important;
          font-size: 12.5px !important;
          letter-spacing: -0.01em !important;
          text-align: center !important;
          line-height: 1.25 !important;
          white-space: nowrap !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        [data-sonner-toast] [data-description] {
          display: none !important;
        }

        /* Completely remove all default icons and close buttons */
        [data-sonner-toast] [data-icon],
        [data-sonner-toast] svg {
          display: none !important;
          visibility: hidden !important;
          width: 0 !important;
          height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        [data-sonner-toast] [data-button],
        [data-sonner-toast] [data-close-button] {
          display: none !important;
        }
      `}</style>
      <Sonner
        position="bottom-center"
        duration={1800}
        visibleToasts={1}
        closeButton={false}
        className="toaster group"
        icons={{
          success: null,
          error: null,
          info: null,
          warning: null,
          loading: null,
        }}
        toastOptions={{
          duration: 1800,
          style: {
            backgroundColor: "rgba(18, 18, 20, 0.94)",
            background: "rgba(18, 18, 20, 0.94)",
            color: "#ffffff",
            borderRadius: "9999px",
            border: "1px solid rgba(255, 255, 255, 0.14)",
            boxShadow: "0 8px 24px -4px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.25)",
            padding: "6px 16px",
            whiteSpace: "nowrap",
            width: "max-content",
            minWidth: "max-content",
            textAlign: "center",
            fontSize: "12.5px",
            fontWeight: "600",
          },
          classNames: {
            toast: "!bg-[#121214]/95 !text-white !rounded-full !border !border-white/15 !shadow-xl !py-1.5 !px-4 !text-center",
            title: "!text-white !font-semibold !text-[12.5px] !text-center !m-0 !whitespace-nowrap",
            description: "!hidden hidden",
            icon: "!hidden hidden",
          },
        }}
        {...props}
      />
    </>
  );
}
