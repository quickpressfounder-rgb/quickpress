import { createFileRoute } from "@tanstack/react-router";

import { MerchantPermissionsScreen } from "../screens/MerchantPermissionsScreen";
import { requirePartnerAuth } from "../lib/auth-guard";

export const Route = createFileRoute("/permissions")({
  beforeLoad: requirePartnerAuth,
  head: () => ({
    meta: [
      { title: "Device Permissions & Background Setup · QuickPress Partner" },
      { name: "description", content: "Configure battery optimization, lockscreen alerts, and sound channels for store orders." },
    ],
  }),
  component: MerchantPermissionsScreen,
});
