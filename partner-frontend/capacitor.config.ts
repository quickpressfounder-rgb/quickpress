import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.quickpress.partner",
  appName: "QuickPress Partner",
  webDir: ".output/public",
  android: {
    allowMixedContent: true,
  },
  server: {
    url: "https://quickpress-partner-mu.vercel.app",
    cleartext: true,
  },
};

export default config;
