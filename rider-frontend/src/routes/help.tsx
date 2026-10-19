import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CaptainHelpScreen } from "../screens/CaptainHelpScreen";
import { ScreenErrorBoundary } from "../components/common/ScreenErrorBoundary";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "24/7 Captain Helpline & Support Desk — QuickPress" },
      {
        name: "description",
        content: "QuickPress Captain Live Support, Tickets, Chat, WhatsApp and Email Helpline",
      },
    ],
  }),
  component: CaptainHelpRoute,
});

function CaptainHelpRoute() {
  const navigate = useNavigate();
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 2) {
      window.history.back();
    } else {
      navigate({ to: "/dashboard" });
    }
  };

  return (
    <ScreenErrorBoundary fallbackTitle="Support Desk Temporarily Unavailable">
      <CaptainHelpScreen
        onBack={handleBack}
        onOpenGuidelines={() => navigate({ to: "/guidelines" })}
      />
    </ScreenErrorBoundary>
  );
}
