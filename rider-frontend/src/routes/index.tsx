import { createFileRoute, redirect } from "@tanstack/react-router";
import { RiderAuthScreen } from "../screens/RiderAuthScreen";
import { readSession } from "../api/core/session-store";
import { isRiderApproved, isRiderOnboarded } from "../lib/auth-guard";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      let sess: any = readSession("rider") || readSession();
      if (!sess) {
        try {
          const raw = window.localStorage.getItem("quickpress.session.rider");
          if (raw) sess = JSON.parse(raw);
        } catch {}
      }
      if (sess && sess.token) {
        throw redirect({ to: "/dashboard" });
      }
    }
  },
  head: () => ({
    meta: [
      { title: "QuickPress Captain — Delivery Partner" },
      {
        name: "description",
        content: "QuickPress Captain — Delivery Partner App with Zero Commission",
      },
    ],
  }),
  component: RiderAuthScreen,
});
