import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourcompany.tts',
  appName: 'Storific Stories',
  // For Next.js static export, use 'out' directory
  // For production builds, this will be populated after 'npm run build:android'
  webDir: process.env.CAPACITOR_WEB_DIR || 'out',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    // For development, uncomment to use local dev server
    // url: 'http://localhost:3000',
    // cleartext: true
    // For production, uncomment to use deployed URL
    // url: 'https://your-vercel-deployment.vercel.app',
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

