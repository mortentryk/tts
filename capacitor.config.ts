import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.eventyr.app',
  appName: 'Interaktive Eventyr',
  webDir: '.next',
  // For development: set server.url to your local dev server (e.g., 'http://localhost:3000')
  // For production: set server.url to your deployed URL (e.g., 'https://yourapp.com')
  // Comment out server.url to use local webDir
  // server: {
  //   url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  //   androidScheme: 'https',
  //   iosScheme: 'https',
  // },
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1a1a2e',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#e94560',
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1a1a2e',
    },
  },
  ios: {
    contentInset: 'automatic',
  },
  android: {
    allowMixedContent: true,
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
    },
  },
};

export default config;

