import { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'com.yourcompany.tts',
  appName: 'Storific Stories',
  // By default we expect a static export in 'out'. When providing a remote URL
  // (CAPACITOR_SERVER_URL), Capacitor will load from that instead.
  webDir: process.env.CAPACITOR_WEB_DIR || 'out',
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: serverUrl.startsWith('http://'),
      }
    : {
        androidScheme: 'https',
        iosScheme: 'https',
        // For development, uncomment to use local dev server
        // url: 'http://localhost:3000',
        // cleartext: true
      },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1a1a2e', // Match your app's dark theme
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
  android: {
    buildOptions: {
      keystorePath: undefined, // Set path to your keystore for release builds
      keystoreAlias: undefined, // Set your keystore alias
    },
  },
};

export default config;

