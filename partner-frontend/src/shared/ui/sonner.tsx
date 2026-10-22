import type { ComponentProps } from "react";
import type { Toaster as Sonner } from "sonner";

type ToasterProps = ComponentProps<typeof Sonner>;

/**
 * Toast notifications disabled across the entire app per partner requirement.
 * Returns null to eliminate all floating toast/capsule notification messages.
 */
export function Toaster(_props: ToasterProps) {
  return null;
}
