import { createFileRoute } from "@tanstack/react-router";
import { RiderAnalyticsScreen } from "../screens/RiderAnalyticsScreen";
import { requireRiderAuth } from "../lib/auth-guard";
import { ScreenErrorBoundary } from "../components/common/ScreenErrorBoundary";

export const Route = createFileRoute("/analytics")({
  beforeLoad: () => {
    requireRiderAuth();
  },
  head: () => ({
    meta: [
      { title: "Performance & Analytics — QuickPress Captain" },
      {
        name: "description",
        content: "QuickPress Captain Performance Analytics, Acceptance Rate, and Earnings Metrics",
      },
    ],
  }),
  component: () => (
    <ScreenErrorBoundary fallbackTitle="Performance Analytics Temporarily Unavailable">
      <RiderAnalyticsScreen />
    </ScreenErrorBoundary>
  ),
});
