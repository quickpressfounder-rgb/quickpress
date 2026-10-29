import { createFileRoute } from "@tanstack/react-router";
import { RiderMenuScreen } from "../screens/RiderMenuScreen";
import { requireRiderSession } from "../lib/auth-guard";
import { ScreenErrorBoundary } from "../components/common/ScreenErrorBoundary";

export const Route = createFileRoute("/menu")({
  beforeLoad: () => {
    requireRiderSession();
  },
  head: () => ({
    meta: [
      { title: "Captain Menu — QuickPress" },
      {
        name: "description",
        content: "QuickPress Captain Navigation Menu, Earnings, and Quick Tools",
      },
    ],
  }),
  component: () => (
    <ScreenErrorBoundary fallbackTitle="Menu Temporarily Unavailable">
      <RiderMenuScreen />
    </ScreenErrorBoundary>
  ),
});
