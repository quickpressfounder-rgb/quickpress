import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CaptainLanguageSelector } from "../components/auth/CaptainLanguageSelector";

import { readSession } from "../api/core/session-store";
import { isRiderApproved, isRiderOnboarded } from "../lib/auth-guard";

export const Route = createFileRoute("/language")({
  head: () => ({
    meta: [
      { title: "Select Language — QuickPress Captain" },
      {
        name: "description",
        content: "Select your preferred language for QuickPress Captain",
      },
    ],
  }),
  component: CaptainLanguageRoute,
});

function CaptainLanguageRoute() {
  const navigate = useNavigate();

  const handleDone = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("qp_has_selected_language", "true");
    }
    const sess: any = readSession("rider") || readSession();
    const hasAuth = Boolean(sess && (sess.token || sess.accessToken));
    if (typeof window !== "undefined" && window.history.length > 2) {
      window.history.back();
    } else if (hasAuth) {
      if (isRiderApproved(sess)) {
        navigate({ to: "/dashboard" });
      } else if (isRiderOnboarded(sess)) {
        navigate({ to: "/verification" });
      } else {
        navigate({ to: "/registration" });
      }
    } else {
      navigate({ to: "/auth" });
    }
  };

  return (
    <CaptainLanguageSelector
      onBack={handleDone}
      onProceed={handleDone}
    />
  );
}
