import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { readSession, sessionExpiresAt } from "@/api/core/session-store";
import { adminRoutes } from "../navigation/admin-routes";

export const Route = createFileRoute("/")({
  ssr: false,
  component: IndexRedirector,
});

function IndexRedirector() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const session = readSession("admin");
      const expiresAt = sessionExpiresAt("admin");
      const expired = typeof expiresAt === "number" && expiresAt <= Date.now();
      if (session?.token && !expired) {
        window.location.replace(adminRoutes.dashboard);
      } else {
        window.location.replace(adminRoutes.auth);
      }
    }
  }, []);

  return <Navigate to={adminRoutes.auth} replace />;
}
