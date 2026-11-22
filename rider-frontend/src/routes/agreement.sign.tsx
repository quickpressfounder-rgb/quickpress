import { createFileRoute } from "@tanstack/react-router";
import { RiderAgreementSigningScreen } from "../screens/RiderAgreementSigningScreen";

export const Route = createFileRoute("/agreement/sign")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  head: () => ({
    meta: [
      { title: "Review & Sign Partner Agreement — QuickPress Captain" },
      {
        name: "description",
        content: "Official QuickPress Delivery Partner Service Level Agreement review and digital execution",
      },
    ],
  }),
  component: RiderAgreementSigningScreen,
});
