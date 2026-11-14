import { createFileRoute, redirect } from "@tanstack/react-router";
import { adminRoutes } from "../navigation/admin-routes";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: adminRoutes.dashboard });
  },
  component: () => null,
});
