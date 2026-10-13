import { createFileRoute, redirect } from "@tanstack/react-router";
import { RiderVerificationScreen } from "../screens/RiderVerificationScreen";
import { requireRiderSession, isRiderApproved, isRiderOnboarded } from "../lib/auth-guard";
import { readSession } from "../api/core/session-store";

export const Route = createFileRoute("/verification")({
  beforeLoad: () => {
    requireRiderSession();
    if (typeof window !== "undefined") {
      const sess = readSession("rider") || readSession();
      // 1. If not registered yet, redirect to registration
      if (!isRiderOnboarded(sess)) {
        throw redirect({ to: "/registration" });
      }
      // 2. If already approved by admin, redirect to operational dashboard
      if (isRiderApproved(sess)) {
        throw redirect({ to: "/dashboard" });
      }
      // 3. Otherwise, stay on /verification screen showing real-time review status
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
