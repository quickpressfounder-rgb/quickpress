import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.quickpress.rider",
  appName: "QuickPress Rider",
  webDir: ".output/public",
  android: {
    allowMixedContent: true,
  },
  server: {
    url: "http://10.68.250.159:8083",
    cleartext: true,
  },
};

export default config;
