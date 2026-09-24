import { createFileRoute, redirect } from "@tanstack/react-router";

import { BusinessRegistrationScreen } from "../screens/BusinessRegistrationScreen";
import { readSession } from "../api/core/session-store";
import { partnerRoutes } from "../navigation/partner-routes";

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
    const isVerified = Boolean(
      sess.isVerified === true ||
      sess.account?.isVerified === true ||
      sess.status === "active" ||
      sess.account?.status === "active" ||
      sess.status === "approved" ||
      sess.account?.status === "approved"
    );
    if (isVerified) {
      throw redirect({ to: partnerRoutes.dashboard });
    }
    const isOnboarded = sess.isOnboarded ?? sess.account?.isOnboarded;
    // If partner already submitted and neither resubmit nor edit is set, redirect to submitted screen
    if (isOnboarded && !search?.resubmit && !search?.edit && sess.status !== "rejected" && (sess as any).kycStatus !== "rejected") {
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
