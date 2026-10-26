import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.quickpress.customer",
  appName: "QuickPress Customer",
  webDir: ".output/public",
  android: {
    allowMixedContent: true,
  },
  server: {
    url: "https://withquickpress.com",
    cleartext: true,
  },
};

export default config;
