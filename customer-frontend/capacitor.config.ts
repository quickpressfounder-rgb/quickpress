import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.quickpress.customer",
  appName: "QuickPress Customer",
  webDir: ".output/public",
  android: {
    allowMixedContent: true,
  },
  ios: {
    allowsLinkPreview: false,
    backgroundColor: "#ffffff",
  },
};

export default config;
