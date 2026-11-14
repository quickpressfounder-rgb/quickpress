import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { adminRoutes } from "../navigation/admin-routes";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthRedirector,
});

function AuthRedirector() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.replace(adminRoutes.dashboard);
    }
  }, []);

  return <Navigate to={adminRoutes.dashboard} replace />;
}
