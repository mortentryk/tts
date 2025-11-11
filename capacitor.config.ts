import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourcompany.tts',
  appName: 'Interaktive Historier',
  // For Next.js static export, use 'out' directory
  // For Next.js with server components, you may need to use a different approach
  webDir: 'out', // Change to '.next' if not using static export
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    // For development, you can uncomment this to use your local dev server
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
};

export default config;

