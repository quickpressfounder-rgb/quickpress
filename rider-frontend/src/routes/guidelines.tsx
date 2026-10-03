import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CaptainGuidelinesScreen } from "../screens/CaptainGuidelinesScreen";
import { requireRiderAuth } from "../lib/auth-guard";

export const Route = createFileRoute("/guidelines")({
  beforeLoad: () => {
    requireRiderAuth();
  },
  head: () => ({
    meta: [
      { title: "Captain Guidelines & Privacy Policy — QuickPress" },
      {
        name: "description",
        content: "QuickPress Captain Delivery Guidelines, Standard Operating Procedures, and Privacy Policy",
      },
    ],
  }),
  component: CaptainGuidelinesRoute,
});

function CaptainGuidelinesRoute() {
  const navigate = useNavigate();
  return (
    <CaptainGuidelinesScreen
      onBack={() => navigate({ to: "/profile" })}
      onOpenSupport={() => navigate({ to: "/support" })}
    />
  );
}
