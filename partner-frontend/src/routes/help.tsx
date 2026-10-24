import { createFileRoute } from "@tanstack/react-router";

import { PartnerHelpScreen } from "../screens/PartnerHelpScreen";
import { requirePartnerAuth } from "../lib/auth-guard";

export const Route = createFileRoute("/help")({
  beforeLoad: requirePartnerAuth,
  head: () => ({
    meta: [
      { title: "Partner Support & Help Centre · QuickPress Partner" },
      { name: "description", content: "24x7 operations helpline, order assistance, and merchant ticket resolution." },
      { property: "og:title", content: "Partner Support & Help Centre · QuickPress Partner" },
      { property: "og:description", content: "24x7 operations helpline, order assistance, and merchant ticket resolution." },
    ],
  }),
  component: PartnerHelpScreen,
});
