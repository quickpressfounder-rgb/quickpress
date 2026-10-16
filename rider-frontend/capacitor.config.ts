import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.quickpress.rider",
  appName: "QuickPress Rider",
  webDir: ".output/public",
  android: {
    allowMixedContent: true,
  },
  server: {
    url: "https://quickpress-rider.vercel.app",
    cleartext: true,
  },
};

export default config;
