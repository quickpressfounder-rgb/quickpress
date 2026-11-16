import { createFileRoute, redirect } from "@tanstack/react-router";
import { adminRoutes } from "../navigation/admin-routes";

export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    throw redirect({ to: adminRoutes.dashboard });
  },
  ssr: false,
  component: () => null,
});
