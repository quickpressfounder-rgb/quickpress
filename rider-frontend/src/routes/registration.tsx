import { createFileRoute, redirect } from "@tanstack/react-router";
import { RiderRegistrationScreen } from "../screens/RiderRegistrationScreen";
import { readSession } from "../api/core/session-store";
import { isRiderApproved, isRiderOnboarded } from "../lib/auth-guard";

export const Route = createFileRoute("/registration")({
  validateSearch: (search: Record<string, unknown>): { resubmit?: boolean; edit?: boolean; ref?: string } => ({
    resubmit: search?.resubmit ? search.resubmit === true || search.resubmit === "true" || search.resubmit === "1" : undefined,
    edit: search?.edit ? search.edit === true || search.edit === "true" || search.edit === "1" : undefined,
    ref: typeof search?.ref === "string" ? search.ref : undefined,
  }),
  beforeLoad: ({ search }: { search: { resubmit?: boolean; edit?: boolean; ref?: string } }) => {
    if (typeof window === "undefined") return;
    const sess = readSession("rider") || readSession();

    // If no session, redirect to auth
    if (!sess || !sess.token) {
      throw redirect({ to: "/auth" });
    }

    // If already approved, DO NOT open registration form -> go to dashboard!
    if (isRiderApproved(sess)) {
      throw redirect({ to: "/dashboard" });
    }

    // If already submitted registration -> go to verification page unless explicitly resubmitting or correcting!
    if (isRiderOnboarded(sess) && !search?.resubmit && !search?.edit) {
      throw redirect({ to: "/verification" });
    }
  },
  head: () => ({
    meta: [
      { title: "Captain Registration — QuickPress" },
      {
        name: "description",
        content: "QuickPress Captain Delivery Partner KYC & Registration",
      },
    ],
  }),
  component: RiderRegistrationScreen,
});
