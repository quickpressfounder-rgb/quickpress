import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CaptainHelpScreen } from "../screens/CaptainHelpScreen";

export const Route = createFileRoute("/support")({
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
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 2) {
      window.history.back();
    } else {
      navigate({ to: "/dashboard" });
    }
  };

  return (
    <CaptainHelpScreen
      onBack={handleBack}
      onOpenGuidelines={() => navigate({ to: "/guidelines" })}
    />
  );
}
