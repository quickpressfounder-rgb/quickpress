import { createFileRoute, redirect } from "@tanstack/react-router";
import { readSession, sessionExpiresAt, writeSession } from "@/api/core/session-store";
import { authenticateCloudflareZeroTrust } from "../api/auth";
import { adminRoutes } from "../navigation/admin-routes";
import { adminHead } from "../lib/head";

export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;

    // 1. If valid cached session exists, enter console immediately
    const session = readSession("admin");
    const expiresAt = sessionExpiresAt("admin");
    const expired = typeof expiresAt === "number" && expiresAt <= Date.now();
    if (session?.token && !expired) {
      throw redirect({ to: adminRoutes.dashboard });
    }

    // 2. Immediate zero-latency Cloudflare Zero Trust perimeter handshake
    try {
      const cfSession = await authenticateCloudflareZeroTrust();
      if (cfSession?.token) {
        writeSession(cfSession, "admin");
        throw redirect({ to: adminRoutes.dashboard });
      }
    } catch (err: any) {
      if ((err as any)?.to) throw err;
      const status = err?.status;
      const msg = String(err?.message || "");

      if (status === 403 || msg.includes("Staff Directory") || msg.includes("enrolled") || msg.includes("suspended")) {
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
  head: () => adminHead("Authenticating Operations...", "QuickPress Operations"),
  component: () => (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center">
      <div className="size-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
    </div>
  ),
});
