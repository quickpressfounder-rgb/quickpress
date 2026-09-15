import { createFileRoute } from "@tanstack/react-router";
import { RiderNotificationsScreen } from "../screens/RiderNotificationsScreen";
import { requireRiderAuth } from "../lib/auth-guard";

export const Route = createFileRoute("/notifications")({
  beforeLoad: () => {
    requireRiderAuth();
  },
  head: () => ({
    meta: [
      { title: "Notifications & Dispatches — QuickPress Captain" },
      {
        name: "description",
        content: "QuickPress Captain Live Order Alerts, Dispatches, and Payout Notifications",
      },
    ],
  }),
  component: RiderNotificationsScreen,
});
