import { createFileRoute, redirect } from "@tanstack/react-router";
import { RiderVerificationScreen } from "../screens/RiderVerificationScreen";
import { requireRiderSession, isRiderApproved } from "../lib/auth-guard";
import { readSession } from "../api/core/session-store";

export const Route = createFileRoute("/verification")({
  beforeLoad: () => {
    requireRiderSession();
    if (typeof window !== "undefined") {
      const sess = readSession("rider") || readSession();
      if (sess && sess.token) {
        throw redirect({ to: "/dashboard" });
      }
    }
  },
  head: () => ({
    meta: [
      { title: "Application Under Verification — QuickPress Captain" },
      {
        name: "description",
        content: "QuickPress Captain KYC verification, document review status, and admin approval tracker",
      },
    ],
  }),
  component: RiderVerificationScreen,
});
