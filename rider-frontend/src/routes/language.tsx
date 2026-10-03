import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CaptainLanguageSelector } from "../components/auth/CaptainLanguageSelector";

import { readSession } from "../api/core/session-store";

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
    const hasAuth = !!readSession("rider")?.accessToken;
    if (typeof window !== "undefined" && window.history.length > 2) {
      window.history.back();
    } else if (hasAuth) {
      navigate({ to: "/dashboard" });
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
