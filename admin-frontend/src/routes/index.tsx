import { createFileRoute, redirect } from "@tanstack/react-router";
import { readSession, sessionExpiresAt, writeSession } from "@/api/core/session-store";
import { authenticateCloudflareZeroTrust } from "../api/auth";
import { adminRoutes } from "../navigation/admin-routes";
import { adminHead } from "../lib/head";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;

    // 1. Check existing active session
    const session = readSession("admin");
    const expiresAt = sessionExpiresAt("admin");
    const expired = typeof expiresAt === "number" && expiresAt <= Date.now();

    if (session?.token && !expired) {
      throw redirect({ to: adminRoutes.dashboard });
    }

    // 2. Perform seamless Cloudflare Zero Trust handshake
    try {
      const cfSession = await authenticateCloudflareZeroTrust();
      if (cfSession?.token) {
        writeSession(cfSession, "admin");
        throw redirect({ to: adminRoutes.dashboard });
      }
    } catch (err: any) {
      const status = err?.status;
      const msg = String(err?.message || "");

      if (status === 403 || msg.includes("Staff Directory") || msg.includes("enrolled")) {
        throw redirect({ to: adminRoutes.unauthorized });
      }

      if (
        import.meta.env.DEV ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
      ) {
        throw redirect({ to: adminRoutes.dashboard });
      }

      throw redirect({ to: adminRoutes.unauthorized });
    }
  },
  head: () => adminHead("Operations Console", "QuickPress Operations & Logistics Console"),
  component: () => null,
});