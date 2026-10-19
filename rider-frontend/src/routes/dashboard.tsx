import { createFileRoute } from "@tanstack/react-router";
import { RiderDashboardScreen } from "../screens/RiderDashboardScreen";
import { requireRiderAuth } from "../lib/auth-guard";
import { ScreenErrorBoundary } from "../components/common/ScreenErrorBoundary";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    requireRiderAuth();
  },
  head: () => ({
    meta: [
      { title: "Captain Hub — QuickPress" },
      {
        name: "description",
        content: "QuickPress Captain Operations Hub & Live Dispatch",
      },
    ],
  }),
  component: () => (
    <ScreenErrorBoundary fallbackTitle="Captain Hub Temporarily Unavailable">
      <RiderDashboardScreen />
    </ScreenErrorBoundary>
  ),
});
