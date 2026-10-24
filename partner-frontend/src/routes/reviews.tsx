import { createFileRoute } from "@tanstack/react-router";

import { PartnerReviewsScreen } from "../screens/PartnerReviewsScreen";
import { requirePartnerAuth } from "../lib/auth-guard";

export const Route = createFileRoute("/reviews")({
  beforeLoad: requirePartnerAuth,
  head: () => ({
    meta: [
      { title: "Customer Reviews & Ratings · QuickPress Partner" },
      { name: "description", content: "View and respond to verified customer reviews for your laundry outlet." },
      { property: "og:title", content: "Customer Reviews & Ratings · QuickPress Partner" },
      { property: "og:description", content: "View and respond to verified customer reviews for your laundry outlet." },
    ],
  }),
  component: PartnerReviewsScreen,
});
