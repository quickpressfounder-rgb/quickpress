import { createFileRoute } from "@tanstack/react-router";
import { RiderOrdersScreen } from "../screens/RiderOrdersScreen";
import { requireRiderAuth } from "../lib/auth-guard";
import { ScreenErrorBoundary } from "../components/common/ScreenErrorBoundary";

export const Route = createFileRoute("/orders")({
  beforeLoad: () => {
    requireRiderAuth();
  },
  validateSearch: (search: Record<string, unknown>): { tab?: string } => {
    return {
      tab: typeof search.tab === "string" ? search.tab : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "My Orders & Ride History — QuickPress Captain" },
      {
        name: "description",
        content: "QuickPress Captain Orders and Delivery Ride History",
      },
    ],
  }),
  component: () => (
    <ScreenErrorBoundary fallbackTitle="Orders & History Temporarily Unavailable">
      <RiderOrdersScreen />
    </ScreenErrorBoundary>
  ),
});
