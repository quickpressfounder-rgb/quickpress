import { createFileRoute } from "@tanstack/react-router";
import { RiderHistoryScreen } from "../screens/RiderHistoryScreen";
import { requireRiderAuth } from "../lib/auth-guard";

export const Route = createFileRoute("/history")({
  beforeLoad: () => {
    requireRiderAuth();
  },
  head: () => ({
    meta: [
      { title: "Order & Trip History — QuickPress Captain" },
      {
        name: "description",
        content: "QuickPress Captain Completed Delivery Orders, Payout Receipts & Trip Details",
      },
    ],
  }),
  component: RiderHistoryScreen,
});
