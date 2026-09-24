import { createFileRoute, redirect } from "@tanstack/react-router";
import { RiderOtpScreen } from "../screens/RiderOtpScreen";
import { readSession } from "../api/core/session-store";
import { isRiderApproved, isRiderOnboarded } from "../lib/auth-guard";

export const Route = createFileRoute("/otp")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const sess = readSession("rider") || readSession();
      if (sess && sess.token) {
        if (isRiderApproved(sess)) {
          throw redirect({ to: "/dashboard" });
        }
        if (isRiderOnboarded(sess)) {
          throw redirect({ to: "/verification" });
        }
        throw redirect({ to: "/registration" });
      }
    }
  },
  head: () => ({
    meta: [
      { title: "Verify OTP — QuickPress Captain" },
      {
        name: "description",
        content: "QuickPress Captain OTP Verification",
      },
    ],
  }),
  component: RiderOtpScreen,
});
