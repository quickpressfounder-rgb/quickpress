import { createFileRoute } from "@tanstack/react-router";
import { RiderAnalyticsScreen } from "../screens/RiderAnalyticsScreen";
import { requireRiderAuth } from "../lib/auth-guard";

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
  component: RiderAnalyticsScreen,
});
