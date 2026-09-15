import { createFileRoute, redirect } from "@tanstack/react-router";
import { partnerRoutes } from "../navigation/partner-routes";

export const Route = createFileRoute("/wallet")({
  beforeLoad: () => {
    throw redirect({ to: partnerRoutes.earnings });
  },
});
