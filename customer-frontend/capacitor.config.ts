import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.quickpress.customer",
  appName: "QuickPress Customer",
  webDir: ".output/public",
  android: {
    allowMixedContent: true,
  },
  server: {
    url: "https://appk-mu.vercel.app",
    cleartext: true,
  },
};

export default config;
