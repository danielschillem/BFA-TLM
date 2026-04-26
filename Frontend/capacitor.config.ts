import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "bf.bfatlm.app",
  appName: "BFA TLM",
  webDir: "dist",
  server: {
    url: "https://bfa-tlm.com",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#1e40af",
  },
  ios: {
    backgroundColor: "#1e40af",
    contentInset: "automatic",
    scheme: "bfatlm",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#1e40af",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
