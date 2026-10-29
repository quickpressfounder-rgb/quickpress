import { createFileRoute } from "@tanstack/react-router";

import { RegistrationSubmittedScreen } from "../screens/RegistrationSubmittedScreen";
import { requirePendingVerification } from "../lib/auth-guard";

export const Route = createFileRoute("/registration-submitted")({
  beforeLoad: requirePendingVerification,
  head: () => ({
    meta: [
      { title: "Registration Submitted · QuickPress Partner" },
      {
        name: "description",
        content: "Your QuickPress partner registration is pending admin verification.",
      },
      { property: "og:title", content: "Registration Submitted · QuickPress Partner" },
      {
        property: "og:description",
        content: "Your QuickPress partner registration is pending admin verification.",
      },
    ],
  }),
  component: RegistrationSubmittedScreen,
});
