import { createFileRoute, redirect } from "@tanstack/react-router";
import { RiderOtpScreen } from "../screens/RiderOtpScreen";
import { readSession } from "../api/core/session-store";
import { isRiderApproved, isRiderOnboarded } from "../lib/auth-guard";

export const Route = createFileRoute("/otp")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      let sess: any = readSession("rider") || readSession();
      if (!sess) {
        try {
          const raw = window.localStorage.getItem("quickpress.session.rider");
          if (raw) sess = JSON.parse(raw);
        } catch {}
      }
      if (sess && sess.token) {
        throw redirect({ to: "/dashboard" });
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
