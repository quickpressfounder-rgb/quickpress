import { createFileRoute, redirect } from "@tanstack/react-router";

import { BusinessRegistrationScreen } from "../screens/BusinessRegistrationScreen";
import { readSession } from "../api/core/session-store";
import { partnerRoutes } from "../navigation/partner-routes";
import {
  isPartnerApproved,
  isPartnerOnboarded,
  isPartnerSuspended,
} from "../lib/auth-guard";

export const Route = createFileRoute("/registration")({
  validateSearch: (search: Record<string, unknown>) => ({
    resubmit: search?.resubmit === true || search?.resubmit === "true" || search?.resubmit === "1",
    edit: search?.edit === true || search?.edit === "true" || search?.edit === "1",
  }),
  beforeLoad: ({ search }: { search: { resubmit?: boolean; edit?: boolean } }) => {
    if (typeof window === "undefined") return;
    const sess = readSession("partner");
    if (!sess || !sess.token) {
      throw redirect({ to: partnerRoutes.auth });
    }
    if (isPartnerSuspended(sess)) {
      throw redirect({ to: partnerRoutes.suspended });
    }
    // If partner is already approved, do not show registration -> go straight to orders
    if (isPartnerApproved(sess)) {
      throw redirect({ to: partnerRoutes.orders });
    }
    const isResubmit =
      search?.resubmit ||
      search?.edit ||
      (typeof window !== "undefined" && (
        new URLSearchParams(window.location.search).get("resubmit") === "true" ||
        new URLSearchParams(window.location.search).get("edit") === "true" ||
        window.sessionStorage?.getItem("qp_partner_resubmit_mode") === "true" ||
        window.localStorage?.getItem("qp_partner_resubmit_mode") === "true"
      ));

    // If partner already submitted registration and neither resubmit nor edit is set -> go to submitted screen
    if (isPartnerOnboarded(sess) && !isResubmit) {
      throw redirect({ to: partnerRoutes.registrationSubmitted });
    }
  },
  head: () => ({
    meta: [
      { title: "Business Registration · QuickPress Partner" },
      { name: "description", content: "Register your laundry business on QuickPress." },
      { property: "og:title", content: "Business Registration · QuickPress Partner" },
      { property: "og:description", content: "Register your laundry business on QuickPress." },
    ],
  }),
  component: BusinessRegistrationScreen,
});
