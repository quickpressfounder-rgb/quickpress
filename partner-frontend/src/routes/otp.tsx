import { createFileRoute, redirect } from "@tanstack/react-router";

import { OtpVerificationScreen } from "../screens/OtpVerificationScreen";
import { readSession } from "../api/core/session-store";
import { partnerRoutes } from "../navigation/partner-routes";
import {
  isPartnerApproved,
  isPartnerOnboarded,
  isPartnerSuspended,
} from "../lib/auth-guard";

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
        if (isPartnerSuspended(sess)) {
          throw redirect({ to: partnerRoutes.suspended });
        }
        if (!isPartnerOnboarded(sess)) {
          throw redirect({ to: partnerRoutes.registration });
        }
        if (!isPartnerApproved(sess)) {
          throw redirect({ to: partnerRoutes.registrationSubmitted });
        }
        throw redirect({ to: partnerRoutes.orders });
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
