import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.quickpress.customer",
  appName: "QuickPress Customer",
  webDir: ".output/public",
  android: {
    allowMixedContent: true,
  },
  server: {
    url: "https://quickpress-customer.vercel.app",
    cleartext: true,
  },
};

export default config;
