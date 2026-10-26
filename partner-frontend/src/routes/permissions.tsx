import { createFileRoute, redirect } from "@tanstack/react-router";

import { MerchantPermissionsScreen } from "../screens/MerchantPermissionsScreen";
import { requirePartnerAuth } from "../lib/auth-guard";
import { partnerRoutes } from "../navigation/partner-routes";
import {
  areAllMerchantPermissionsGranted,
  hasCompletedPermissionsOnboarding,
} from "../lib/merchant-device-opt";

export const Route = createFileRoute("/permissions")({
  beforeLoad: ({ search }: any) => {
    requirePartnerAuth();
    if (typeof window !== "undefined") {
      const isManual =
        search?.manage === "true" ||
        search?.manage === true ||
        window.location.search.includes("manage=true");
      if (!isManual) {
        if (areAllMerchantPermissionsGranted() || hasCompletedPermissionsOnboarding()) {
          throw redirect({ to: partnerRoutes.dashboard });
        }
      }
    }
  },
  head: () => ({
    meta: [
      { title: "Device Permissions & Background Setup · QuickPress Partner" },
      { name: "description", content: "Configure battery optimization, lockscreen alerts, and sound channels for store orders." },
    ],
  }),
  component: MerchantPermissionsScreen,
});
