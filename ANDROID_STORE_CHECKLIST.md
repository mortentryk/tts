# Android App Store Submission Checklist

This document outlines everything needed to prepare your app for Google Play Store submission.

## 🔴 Critical Missing Items

### 1. Capacitor Setup & Configuration
- [ ] **Install Capacitor** - Not currently in package.json
  ```bash
  npm install @capacitor/core @capacitor/cli @capacitor/android
  ```
- [ ] **Create `capacitor.config.ts`** - Missing configuration file
- [ ] **Initialize Android platform** - Android directory is incomplete
  ```bash
  npx cap add android
  ```

### 2. Android Project Structure
Your `android/` directory only contains build artifacts. You need:
- [ ] **AndroidManifest.xml** - App permissions, package name, version
- [ ] **build.gradle** (project level) - Build configuration
- [ ] **build.gradle** (app level) - App dependencies, SDK versions
- [ ] **settings.gradle** - Project settings
- [ ] **gradle.properties** - Gradle configuration
- [ ] **res/** directory structure:
  - [ ] **mipmap/** - App icons (multiple densities)
  - [ ] **drawable/** - Splash screens, images
  - [ ] **values/** - Strings, colors, styles

### 3. App Icons & Assets
- [ ] **App Icon** - 512x512px (required for Play Store)
- [ ] **Adaptive Icons** - Multiple sizes (48dp, 72dp, 96dp, 144dp, 192dp)
- [ ] **Splash Screen** - Launch screen assets
- [ ] **Feature Graphic** - 1024x500px for Play Store listing

### 4. App Signing
- [ ] **Keystore file** - For signing release builds
- [ ] **Signing configuration** - In build.gradle
- [ ] **Store signing key backup** - CRITICAL: Keep secure backup

### 5. AndroidManifest.xml Requirements
Must include:
- [ ] **Package name** - Unique identifier (e.g., `com.yourcompany.tts`)
- [ ] **App name** - Display name
- [ ] **Version code** - Incremental integer
- [ ] **Version name** - User-visible version (e.g., "1.0.0")
- [ ] **Minimum SDK** - API level 21+ (Android 5.0+)
- [ ] **Target SDK** - API level 34+ (Android 14) - **REQUIRED**
- [ ] **Internet permission** - For API calls
- [ ] **Network security config** - For HTTPS requirements

### 6. Build Configuration
- [ ] **Target SDK 34+** - Google Play requirement (as of 2024)
- [ ] **64-bit support** - Required for new apps
- [ ] **App Bundle format** - Must build .aab (not .apk)
- [ ] **ProGuard/R8** - Code obfuscation (optional but recommended)

## 🟡 Store Listing Requirements

### 7. Google Play Console Setup
- [ ] **Google Play Developer Account** - $25 one-time fee
- [ ] **App created in Play Console** - Basic app entry

### 8. Store Listing Information
- [ ] **App Title** - Max 50 characters
- [ ] **Short Description** - Max 80 characters
- [ ] **Full Description** - Max 4,000 characters
- [ ] **App Category** - Select appropriate category
- [ ] **Content Rating** - Complete questionnaire (IARC)
- [ ] **Screenshots** - Minimum 2, up to 8 screenshots
  - Phone: 16:9 or 9:16 aspect ratio
  - Tablet (if supported): 16:9 or 9:16
- [ ] **Feature Graphic** - 1024x500px
- [ ] **App Icon** - 512x512px (transparent background)

### 9. Privacy & Compliance
- [ ] **Privacy Policy URL** - ✅ You have `/privacy` page
  - Must be publicly accessible
  - Must be linked in Play Console
- [ ] **Data Safety Form** - Complete in Play Console
  - Data collection types
  - Data sharing practices
  - Security practices
- [ ] **Terms of Service** - ✅ You have `/terms` page
- [ ] **GDPR Compliance** - ✅ Your privacy policy covers this

### 10. Payment Integration
- [ ] **In-App Purchases** - If using Google Play Billing
  - Currently using Stripe web payments - may need to add Google Play Billing
  - Or keep web-only payments (users purchase on website)
- [ ] **Subscription Management** - If offering subscriptions
- [ ] **Refund Policy** - ✅ You have `/refund` page

## 🟢 Technical Requirements

### 11. Permissions
Review and declare only necessary permissions:
- [ ] **INTERNET** - For API calls (required)
- [ ] **ACCESS_NETWORK_STATE** - Optional, for checking connectivity
- [ ] **WAKE_LOCK** - If needed for audio playback
- [ ] **FOREGROUND_SERVICE** - If needed for background audio
- [ ] **POST_NOTIFICATIONS** - If sending notifications (Android 13+)

### 12. Network Security
- [ ] **HTTPS only** - All network requests must use HTTPS
- [ ] **Network Security Config** - If using custom certificates
- [ ] **Cleartext traffic** - Disable in production

### 13. Content & Media
- [ ] **Audio playback** - Test TTS functionality
- [ ] **Video playback** - Test video backgrounds
- [ ] **Image loading** - Test Cloudinary images
- [ ] **Offline handling** - Graceful degradation

### 14. Testing
- [ ] **Internal testing** - Test with internal testers
- [ ] **Closed testing** - Test with beta users
- [ ] **Device testing** - Test on multiple Android versions
- [ ] **Performance testing** - Check app size, load times
- [ ] **Crash-free rate** - Aim for >99%

## 📋 Implementation Steps

### Step 1: Install Capacitor
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npm install --save-dev @capacitor/cli
```

### Step 2: Create Capacitor Config
Create `capacitor.config.ts` in project root:
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourcompany.tts',
  appName: 'Interaktive Historier',
  webDir: 'out', // or '.next' depending on your build
  server: {
    androidScheme: 'https'
  },
  plugins: {
    // Add plugins as needed
  }
};

export default config;
```

### Step 3: Initialize Android
```bash
npx cap init
npx cap add android
npx cap sync
```

### Step 4: Configure Android Project
- Update `android/app/build.gradle`:
  - Set `targetSdkVersion` to 34
  - Set `minSdkVersion` to 21
  - Configure signing
  - Enable 64-bit support

### Step 5: Create App Icons
- Generate icons using tools like:
  - [App Icon Generator](https://www.appicon.co/)
  - [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/)
- Place in `android/app/src/main/res/mipmap-*/`

### Step 6: Build App Bundle
```bash
npm run build
npx cap sync
cd android
./gradlew bundleRelease
```
Output: `android/app/build/outputs/bundle/release/app-release.aab`

### Step 7: Test Build
```bash
# Install on connected device
npx cap run android
```

## 🔍 Additional Considerations

### Payment Strategy
Your app currently uses Stripe web payments. For Android:
- **Option A**: Keep web-only payments (users purchase on website)
  - Simpler implementation
  - No Google Play Billing integration needed
  - Users must purchase via web browser
  
- **Option B**: Add Google Play Billing
  - Native in-app purchases
  - Google takes 15-30% commission
  - More complex implementation
  - Better user experience

### Environment Variables
- [ ] **Configure for mobile** - Update API endpoints for mobile
- [ ] **Handle deep links** - For purchase redirects
- [ ] **Secure storage** - For sensitive data

### Performance
- [ ] **App size** - Optimize images, assets
- [ ] **Load times** - Optimize initial load
- [ ] **Memory usage** - Monitor for leaks

## 📝 Pre-Submission Checklist

Before submitting to Play Store:

- [ ] App builds successfully as .aab
- [ ] App tested on multiple devices
- [ ] All features work correctly
- [ ] Privacy policy URL is accessible
- [ ] Terms of service URL is accessible
- [ ] App icon and screenshots ready
- [ ] Store listing content written
- [ ] Content rating completed
- [ ] Data safety form completed
- [ ] App signed with release keystore
- [ ] Version code incremented
- [ ] Target SDK is 34+
- [ ] 64-bit support enabled
- [ ] No crashes in testing
- [ ] Performance is acceptable

## 🚨 Common Rejection Reasons

Avoid these common issues:
- Target SDK too low (must be 34+)
- Missing privacy policy
- Incomplete data safety form
- App crashes on launch
- Missing required permissions
- Using deprecated APIs
- App size too large
- Poor performance
- Missing app icon
- Incomplete store listing

## 📚 Resources

- [Google Play Console](https://play.google.com/console)
- [Capacitor Android Documentation](https://capacitorjs.com/docs/android)
- [Android App Bundle Guide](https://developer.android.com/guide/app-bundle)
- [Play Store Policies](https://play.google.com/about/developer-content-policy/)

---

**Next Steps**: Start with Step 1 (Installing Capacitor) and work through each section systematically.

