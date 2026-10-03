import { useEffect, useState } from "react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Modern floating bottom capsule notification pill (Zomato / Apple style):
 * - Centered at the bottom of the screen
 * - Dark charcoal pill shape (rounded-full)
 * - Crisp white typography without any icons
 * - Elevated soft drop-shadow
 */
export function Toaster({ ...props }: ToasterProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
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
          bottom: 24px !important;
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
          z-index: 999999 !important;
          transform: none !important;
        }

        /* Adjust bottom offset if partner bottom navigation is mounted */
        body:has(nav[aria-label="Partner Navigation"]:not(.translate-y-full)) [data-sonner-toaster] {
          bottom: calc(env(safe-area-inset-bottom, 0px) + 76px) !important;
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
          max-width: min(calc(100vw - 32px), 440px) !important;
          margin-left: auto !important;
          margin-right: auto !important;
          display: inline-flex !important;
          flex-direction: row !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
          background: #18181b !important;
          color: #ffffff !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          border-radius: 9999px !important;
          box-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.6), 0 4px 16px rgba(0, 0, 0, 0.3) !important;
          padding: 10px 22px !important;
          pointer-events: auto !important;
          box-sizing: border-box !important;
        }

        [data-sonner-toast] [data-content] {
          display: flex !important;
          flex-direction: column !important;
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
          font-weight: 700 !important;
          font-size: 13px !important;
          letter-spacing: -0.01em !important;
          text-align: center !important;
          line-height: 1.35 !important;
          white-space: normal !important;
          word-break: break-word !important;
          margin: 0 auto !important;
          padding: 0 !important;
        }

        [data-sonner-toast] [data-description] {
          color: #e4e4e7 !important;
          font-weight: 600 !important;
          font-size: 12px !important;
          text-align: center !important;
          white-space: normal !important;
          word-break: break-word !important;
          margin-top: 2px !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }

        /* Completely remove all icons */
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
        duration={2500}
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
          duration: 2500,
          style: {
            backgroundColor: "#18181b",
            background: "#18181b",
            color: "#ffffff",
            borderRadius: "9999px",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            boxShadow: "0 16px 36px -4px rgba(0, 0, 0, 0.6), 0 4px 16px rgba(0, 0, 0, 0.3)",
            padding: "10px 22px",
            width: "auto",
            maxWidth: "min(calc(100vw - 32px), 460px)",
            margin: "0 auto",
            textAlign: "center",
            fontSize: "13px",
            fontWeight: "700",
          },
          classNames: {
            toast: "!bg-[#18181b] !text-white !rounded-full !border !border-white/15 !shadow-2xl !py-2.5 !px-5 !text-center !mx-auto",
            title: "!text-white !font-bold !text-[13px] !text-center !m-0 !whitespace-normal !break-words",
            description: "!text-zinc-200 !font-semibold !text-xs !text-center !m-0 !whitespace-normal !break-words",
            icon: "!hidden hidden",
          },
        }}
        {...props}
      />
    </>
  );
}

