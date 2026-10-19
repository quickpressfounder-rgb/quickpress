import { createFileRoute } from "@tanstack/react-router";
import { RiderWalletScreen } from "../screens/RiderWalletScreen";
import { requireRiderAuth } from "../lib/auth-guard";
import { ScreenErrorBoundary } from "../components/common/ScreenErrorBoundary";

export const Route = createFileRoute("/wallet")({
  beforeLoad: () => {
    requireRiderAuth();
  },
  head: () => ({
    meta: [
      { title: "Earnings & Wallet — QuickPress Captain" },
      {
        name: "description",
        content: "QuickPress Captain Wallet, Direct Bank Settlements, and Earnings Passbook",
      },
    ],
  }),
  component: () => (
    <ScreenErrorBoundary fallbackTitle="Earnings & Wallet Temporarily Unavailable">
      <RiderWalletScreen />
    </ScreenErrorBoundary>
  ),
});
