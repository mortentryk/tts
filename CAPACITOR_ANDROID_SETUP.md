# Capacitor Android Setup Guide

This guide explains how to build your Next.js app as an Android app using Capacitor.

## 📱 Two Approaches

### Option 1: Static Export (Offline-capable, but loses API routes)
- Builds a fully static version of your app
- Works offline
- **Limitation**: API routes won't work (TTS, Stripe, etc. won't function)
- Best for: Simple apps without server-side features

### Option 2: Deployed URL (Full functionality, requires internet)
- Points Capacitor to your deployed Vercel URL
- All features work (API routes, server components)
- Requires internet connection
- Best for: Full-featured apps with backend functionality

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ installed
- Android Studio installed
- Java JDK 17+ installed

### Step 1: Install Capacitor (Already Done ✅)
```bash
npm install --save-dev @capacitor/core @capacitor/cli @capacitor/android @capacitor/splash-screen
```

### Step 2: Initialize Android Platform
```bash
npx cap add android
```

This will:
- Create the `android/` directory with full Android project structure
- Set up Gradle build files
- Configure AndroidManifest.xml

### Step 3: Choose Your Approach

#### Option A: Static Export (Limited Features)
1. Update `next.config.js` to enable static export:
   ```js
   output: process.env.BUILD_STATIC === 'true' ? 'export' : undefined,
   ```

2. Build static version:
   ```bash
   npm run build:static
   ```

3. Sync with Capacitor:
   ```bash
   npm run cap:sync
   ```

#### Option B: Use Deployed URL (Recommended)
1. Update `capacitor.config.ts`:
   ```ts
   server: {
     url: 'https://your-app.vercel.app', // Your deployed URL
     androidScheme: 'https',
   },
   ```

2. Sync with Capacitor:
   ```bash
   npm run cap:sync
   ```

### Step 4: Open in Android Studio
```bash
npm run cap:open:android
```

### Step 5: Build and Run
1. In Android Studio:
   - Wait for Gradle sync to complete
   - Connect an Android device or start an emulator
   - Click "Run" (green play button)

Or use command line:
```bash
npm run cap:run:android
```

## 🔧 Configuration

### Update App ID
Edit `capacitor.config.ts`:
```ts
appId: 'com.yourcompany.tts', // Change to your actual package name
```

### Update App Name
```ts
appName: 'Interaktive Historier', // Your app display name
```

### Configure Splash Screen
Splash screen is already configured in `capacitor.config.ts`. You'll need to add splash screen images:
- Place images in `android/app/src/main/res/drawable/`
- Or use Android Studio's Image Asset Studio

## 📦 Building for Release

### 1. Generate Keystore
```bash
keytool -genkey -v -keystore tts-release-key.keystore -alias tts-key -keyalg RSA -keysize 2048 -validity 10000
```

### 2. Update capacitor.config.ts
```ts
android: {
  buildOptions: {
    keystorePath: './tts-release-key.keystore',
    keystoreAlias: 'tts-key',
  },
},
```

### 3. Build Release APK
In Android Studio:
- Build → Generate Signed Bundle / APK
- Select "APK" or "Android App Bundle"
- Follow the signing wizard

## 🎨 App Icons & Assets

### Required Sizes
- **App Icon**: 512x512px (for Play Store)
- **Adaptive Icons**: 
  - 48dp (mdpi)
  - 72dp (hdpi)
  - 96dp (xhdpi)
  - 144dp (xxhdpi)
  - 192dp (xxxhdpi)

### Generate Icons
Use Android Studio's Image Asset Studio:
1. Right-click `res` folder → New → Image Asset
2. Select "Launcher Icons"
3. Upload your 512x512px icon
4. Generate all densities

## 📝 AndroidManifest.xml

Key configurations needed:
- **Package name**: Unique identifier (e.g., `com.yourcompany.tts`)
- **Version code**: Incremental integer (1, 2, 3...)
- **Version name**: User-visible version (e.g., "1.0.0")
- **Minimum SDK**: API 21+ (Android 5.0+)
- **Target SDK**: API 34+ (Android 14) - **REQUIRED**
- **Internet permission**: Already included for API calls

## 🔐 Permissions

Your app will need these permissions (add to AndroidManifest.xml if needed):
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

## 🚨 Important Notes

1. **API Routes**: If using static export, API routes won't work. Use the deployed URL approach instead.

2. **Environment Variables**: For Android builds, you may need to:
   - Use Capacitor's environment plugin
   - Or hardcode production URLs in the config

3. **Build Output**: 
   - Static export: `out/` directory
   - Regular build: `.next/` directory

4. **Testing**: Always test on a real device before release

## 📚 Useful Commands

```bash
# Sync web assets to Android
npm run cap:sync

# Open Android Studio
npm run cap:open:android

# Run on connected device/emulator
npm run cap:run:android

# Build static version
npm run build:static

# Full Android build
npm run build:android
```

## 🐛 Troubleshooting

### Build Errors
- **Gradle sync fails**: Check Java JDK version (need 17+)
- **Missing dependencies**: Run `npm install` and `npx cap sync`
- **TypeScript errors**: Capacitor config is now included in tsconfig

### Runtime Issues
- **White screen**: Check Capacitor webDir path
- **API calls fail**: Ensure using deployed URL or static export correctly
- **Icons missing**: Generate icons using Android Studio

## 📖 Next Steps

1. ✅ Capacitor installed
2. ⬜ Initialize Android platform: `npx cap add android`
3. ⬜ Choose static export or deployed URL
4. ⬜ Configure app ID and name
5. ⬜ Add app icons
6. ⬜ Test on device
7. ⬜ Build release APK
8. ⬜ Submit to Google Play Store

See `ANDROID_STORE_CHECKLIST.md` for complete Play Store submission checklist.

