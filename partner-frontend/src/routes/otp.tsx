import { createFileRoute, redirect } from "@tanstack/react-router";

import { OtpVerificationScreen } from "../screens/OtpVerificationScreen";
import { readSession } from "../api/core/session-store";
import { partnerRoutes } from "../navigation/partner-routes";

export const Route = createFileRoute("/otp")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      let sess: any = readSession("partner") || readSession();
      if (!sess) {
        try {
          const raw = window.localStorage.getItem("quickpress.session.partner");
          if (raw) sess = JSON.parse(raw);
        } catch {}
      }
      if (sess && sess.token) {
        const isVerified = Boolean(
          sess.isVerified === true ||
          sess.account?.isVerified === true ||
          sess.status === "approved" ||
          sess.account?.status === "approved"
        );
        const isOnboarded = sess.isOnboarded ?? sess.account?.isOnboarded;
        if (!isOnboarded) {
          throw redirect({ to: partnerRoutes.registration });
        } else if (!isVerified) {
          throw redirect({ to: partnerRoutes.registrationSubmitted });
        } else {
          throw redirect({ to: partnerRoutes.orders });
        }
      }
    }
  },
  head: () => ({
    meta: [
      { title: "Verify Mobile · QuickPress Partner" },
      { name: "description", content: "Verify your mobile number to access the partner app." },
      { property: "og:title", content: "Verify Mobile · QuickPress Partner" },
      { property: "og:description", content: "Verify your mobile number to access the partner app." },
    ],
  }),
  component: OtpVerificationScreen,
});

