/**
 * Format numeric amounts cleanly in Indian Rupees (INR).
 */
export function inr(amount: number | string | null | undefined): string {
  const num = Number(amount ?? 0);
  if (!Number.isFinite(num)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: num % 1 === 0 ? 0 : 2,
  }).format(num);
}

