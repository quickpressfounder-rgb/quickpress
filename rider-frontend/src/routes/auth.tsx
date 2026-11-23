import { createFileRoute, redirect } from "@tanstack/react-router";
import { RiderAuthScreen } from "../screens/RiderAuthScreen";
import { readSession } from "../api/core/session-store";
import { isRiderApproved, isRiderOnboarded } from "../lib/auth-guard";

export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      let sess: any = readSession("rider") || readSession();
      if (!sess) {
        try {
          const raw =
            window.localStorage.getItem("quickpress.session.rider") ||
            window.sessionStorage.getItem("quickpress.session.rider");
          if (raw) sess = JSON.parse(raw);
        } catch {
          /* ignore */
        }
      }
      if (sess && sess.token) {
        if (isRiderApproved(sess)) {
          throw redirect({ to: "/dashboard" });
        }
        if (isRiderOnboarded(sess)) {
          throw redirect({ to: "/verification" });
        }
        throw redirect({ to: "/registration" });
      }
    }
  },
  head: () => ({
    meta: [
      { title: "Captain Login — QuickPress" },
      {
        name: "description",
        content: "QuickPress Captain Delivery Partner Login Portal",
      },
    ],
  }),
  component: RiderAuthScreen,
});
