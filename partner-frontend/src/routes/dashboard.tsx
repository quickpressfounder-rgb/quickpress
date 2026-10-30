import { createFileRoute, redirect } from "@tanstack/react-router";

import { partnerRoutes } from "../navigation/partner-routes";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: partnerRoutes.orders });
  },
  component: () => null,
});
