import { createFileRoute } from "@tanstack/react-router";
import { CaptainPermissionsScreen } from "../screens/CaptainPermissionsScreen";
import { requireRiderAuth } from "../lib/auth-guard";

export const Route = createFileRoute("/permissions")({
  beforeLoad: () => {
    requireRiderAuth();
  },
  head: () => ({
    meta: [
      { title: "Captain Duty & Device Permissions — QuickPress" },
      {
        name: "description",
        content: "Configure background GPS, floating bubble, and sirens for QuickPress Captain.",
      },
    ],
  }),
  component: CaptainPermissionsScreen,
});
