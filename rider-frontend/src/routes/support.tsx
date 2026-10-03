import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CaptainHelpScreen } from "../screens/CaptainHelpScreen";
import { requireRiderAuth } from "../lib/auth-guard";

export const Route = createFileRoute("/support")({
  beforeLoad: () => {
    requireRiderAuth();
  },
  head: () => ({
    meta: [
      { title: "24/7 Captain Helpline & Support Desk — QuickPress" },
      {
        name: "description",
        content: "QuickPress Captain Live Support, Tickets, Chat, WhatsApp and Email Helpline",
      },
    ],
  }),
  component: CaptainSupportRoute,
});

function CaptainSupportRoute() {
  const navigate = useNavigate();
  return (
    <CaptainHelpScreen
      onBack={() => navigate({ to: "/profile" })}
      onOpenGuidelines={() => navigate({ to: "/guidelines" })}
    />
  );
}
