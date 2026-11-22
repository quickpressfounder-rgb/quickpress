import { createFileRoute } from "@tanstack/react-router";
import { PartnerAgreementSigningScreen } from "../screens/PartnerAgreementSigningScreen";

export const Route = createFileRoute("/agreement/sign")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  head: () => ({
    meta: [
      { title: "Review & Sign Master Merchant Agreement — QuickPress Partner" },
      {
        name: "description",
        content: "Official QuickPress Master Merchant Service Level Agreement review and digital execution",
      },
    ],
  }),
  component: PartnerAgreementSigningScreen,
});
