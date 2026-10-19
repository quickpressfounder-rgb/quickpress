import { createFileRoute } from "@tanstack/react-router";
import { RiderProfileScreen } from "../screens/RiderProfileScreen";
import { requireRiderSession } from "../lib/auth-guard";
import { ScreenErrorBoundary } from "../components/common/ScreenErrorBoundary";

export const Route = createFileRoute("/profile")({
  beforeLoad: () => {
    requireRiderSession();
  },
  head: () => ({
    meta: [
      { title: "Captain Profile — QuickPress Partner" },
      {
        name: "description",
        content: "QuickPress Captain Delivery Partner Profile, Vehicle KYC, and Bank Settlement",
      },
    ],
  }),
  component: () => (
    <ScreenErrorBoundary fallbackTitle="Profile Temporarily Unavailable">
      <RiderProfileScreen />
    </ScreenErrorBoundary>
  ),
});
