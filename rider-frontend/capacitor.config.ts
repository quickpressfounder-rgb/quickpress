import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.quickpress.rider",
  appName: "QuickPress Rider",
  webDir: ".output/public",
  android: {
    allowMixedContent: true,
  },
  server: {
    url: "https://quickpress-caption.vercel.app",
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 400,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
