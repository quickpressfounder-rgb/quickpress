import type { TicketStatus } from "@/api/customer/help-api";

export type TicketBucket = "all" | "active" | "solved" | "closed";

export function getTicketBucket(status: TicketStatus): Exclude<TicketBucket, "all"> {
  if (status === "resolved") return "solved";
  if (status === "closed") return "closed";
  return "active";
}

export function getStatusBadgeStyle(status: TicketStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case "open":
      return {
        label: "Open",
        className: "bg-amber-50 text-amber-800 border-amber-200",
      };
    case "in-progress":
      return {
        label: "In Progress",
        className: "bg-blue-50 text-blue-700 border-blue-200",
      };
    case "awaiting-customer":
      return {
        label: "Awaiting Reply",
        className: "bg-orange-50 text-orange-800 border-orange-200",
      };
    case "resolved":
      return {
        label: "Solved",
        className: "bg-zinc-100 text-zinc-800 border-zinc-200",
      };
    case "closed":
      return {
        label: "Closed",
        className: "bg-zinc-100 text-zinc-600 border-zinc-200",
      };
    default:
      return {
        label: "Open",
        className: "bg-zinc-100 text-zinc-700 border-zinc-200",
      };
  }
}

export function formatRelativeTicketTime(iso?: string | null): string {
  if (!iso) return "Just now";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "Recently";
  const diffMin = Math.floor((Date.now() - parsed.getTime()) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

