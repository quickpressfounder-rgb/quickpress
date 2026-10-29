import type React from "react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Permanently suppress floating Sonner toasts in Captain/Rider app so no black action messages appear
const noopToast = (() => {}) as any;
noopToast.success = () => "";
noopToast.error = () => "";
noopToast.info = () => "";
noopToast.warning = () => "";
noopToast.message = () => "";
noopToast.dismiss = () => {};
noopToast.loading = () => "";
noopToast.custom = () => "";
noopToast.promise = () => Promise.resolve("");

export { noopToast as toast };

/**
 * Suppressed Toaster: Returns null so floating black action messages never mount or display.
 */
export function Toaster({ ...props }: ToasterProps) {
  return null;
}

