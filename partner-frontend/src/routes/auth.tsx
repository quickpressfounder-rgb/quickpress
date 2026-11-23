import { createFileRoute, redirect } from "@tanstack/react-router";

import { PartnerAuthScreen } from "../screens/PartnerAuthScreen";
import { readSession } from "../api/core/session-store";
import { partnerRoutes } from "../navigation/partner-routes";
import {
  isPartnerApproved,
  isPartnerOnboarded,
  isPartnerSuspended,
} from "../lib/auth-guard";

export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    let sess: any = readSession("partner") || readSession();
    if (!sess) {
      try {
        const raw =
          window.localStorage.getItem("quickpress.session.partner") ||
          window.sessionStorage.getItem("quickpress.session.partner");
        if (raw) sess = JSON.parse(raw);
      } catch {
        /* ignore */
      }
    }
    if (sess && sess.token) {
      if (isPartnerSuspended(sess)) {
        throw redirect({ to: partnerRoutes.suspended });
      }
      if (isPartnerApproved(sess)) {
        throw redirect({ to: partnerRoutes.orders });
      }
      if (isPartnerOnboarded(sess)) {
        throw redirect({ to: partnerRoutes.registrationSubmitted });
      }
      throw redirect({ to: partnerRoutes.registration });
    }
  },
  head: () => ({
    meta: [
      { title: "Partner Login · QuickPress Partner" },
      { name: "description", content: "Sign in to your QuickPress partner store." },
      { property: "og:title", content: "Partner Login · QuickPress Partner" },
      { property: "og:description", content: "Sign in to your QuickPress partner store." },
    ],
  }),
  component: PartnerAuthScreen,
});
