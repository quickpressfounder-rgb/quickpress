import { useEffect, useState } from "react";
import { Toaster as Sonner } from "sonner";
import { Check, AlertCircle, Info, XCircle } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Global Toaster component:
 * - Positioned at bottom-center (floating above bottom navigation)
 * - Full-width layout spanning across viewport (w-[calc(100vw-24px)] max-w-[440px])
 * - Clean white background with crisp border and high-contrast bold black text
 * - Auto-dismiss: ~500ms
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof window === "undefined") {
    return null;
  }

  return (
    <Sonner
      className="toaster group pointer-events-none"
      position="bottom-center"
      duration={500}
      offset="80px"
      style={
        {
          "--width": "calc(100vw - 24px)",
          maxWidth: "440px",
          width: "calc(100vw - 24px)",
        } as React.CSSProperties
      }
      icons={{
        success: (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300/80 shadow-2xs">
            <Check className="size-3.5 stroke-[3]" />
          </span>
        ),
        error: (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700 border border-rose-300/80 shadow-2xs">
            <XCircle className="size-4 stroke-[2.5]" />
          </span>
        ),
        info: (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 border border-blue-300/80 shadow-2xs">
            <Info className="size-4 stroke-[2.5]" />
          </span>
        ),
        warning: (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 border border-amber-300/80 shadow-2xs">
            <AlertCircle className="size-4 stroke-[2.5]" />
          </span>
        ),
      }}
      toastOptions={{
        duration: 500,
        style: {
          width: "calc(100vw - 24px)",
          maxWidth: "440px",
          backgroundColor: "#ffffff",
          color: "#09090b",
          border: "1px solid #e4e4e7",
          boxShadow: "0 14px 40px -8px rgba(0, 0, 0, 0.16), 0 4px 12px rgba(0, 0, 0, 0.06)",
          borderRadius: "16px",
        },
        classNames: {
          toast:
            "group toast pointer-events-auto group-[.toaster]:!w-[calc(100vw-24px)] group-[.toaster]:!max-w-[440px] group-[.toaster]:!bg-white group-[.toaster]:!text-zinc-950 group-[.toaster]:!border group-[.toaster]:!border-zinc-200 group-[.toaster]:!shadow-[0_14px_40px_-8px_rgba(0,0,0,0.16)] group-[.toaster]:!rounded-2xl group-[.toaster]:!px-4.5 group-[.toaster]:!py-3.5 group-[.toaster]:!font-bold group-[.toaster]:!text-xs group-[.toaster]:!tracking-tight group-[.toaster]:!gap-3 group-[.toaster]:!mx-auto",
          title: "group-[.toast]:!text-zinc-950 group-[.toast]:!font-black group-[.toast]:!text-xs",
          description: "group-[.toast]:!text-zinc-600 group-[.toast]:!font-medium group-[.toast]:!text-[11px]",
          actionButton: "group-[.toast]:!bg-black group-[.toast]:!text-white",
          cancelButton: "group-[.toast]:!bg-zinc-100 group-[.toast]:!text-zinc-800",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };

